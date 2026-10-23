import json
import os
import time
from typing import Any, Callable, Protocol

from google import genai
from google.genai import errors as genai_errors
from google.genai import types
import httpx

ToolCallback = Callable[[list[str]], list[dict[str, Any]]]

PROVEDORES_SUPORTADOS = ("deepseek", "gemini")

DEEPSEEK_ERP_TOOL_SCHEMA: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "buscar_dados_erp",
        "description": (
            "Consulta preço unitário e quantidade em estoque no ERP "
            "para uma lista de códigos SKU."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "skus": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Lista de códigos SKU exatos extraídos do catálogo técnico "
                        "(ex: ['AMOR-G5-01', 'AMOR-G5-02'])."
                    ),
                }
            },
            "required": ["skus"],
        },
    },
}


class LLMTimeoutError(Exception):
    """Exceção de domínio lançada quando o provedor de IA excede o tempo limite (15s)."""

    def __init__(self, provider_name: str, message: str = "") -> None:
        self.provider_name = provider_name
        detail = message or f"Timeout ao aguardar resposta do provedor de IA ({provider_name})."
        super().__init__(detail)


class LLMProviderError(Exception):
    """Exceção de domínio lançada quando há falha de comunicação/autenticação no provedor de IA."""

    def __init__(self, provider_name: str, message: str) -> None:
        self.provider_name = provider_name
        super().__init__(f"Erro de comunicação com o provedor de IA ({provider_name}): {message}")


class LLMProvider(Protocol):
    """Contrato abstrato (SOLID DIP) para injeção de dependência de motores de IA."""

    def gerar_resposta(
        self,
        system_prompt: str,
        pergunta: str,
        buscar_dados_erp: ToolCallback,
    ) -> str:
        ...


class DeepSeekProvider:
    """Adaptador concreto para a API da DeepSeek (OpenAI-compatible Chat Completions + Tool Calling)."""

    def __init__(
        self,
        api_key: str,
        model: str = "deepseek-chat",
        base_url: str = "https://api.deepseek.com",
        timeout: float = 15.0,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _post_chat_completions(
        self,
        client: httpx.Client,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries):
            try:
                response = client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise LLMTimeoutError(
                    "deepseek",
                    "Timeout ao aguardar resposta da API da DeepSeek.",
                ) from exc
            except httpx.HTTPError as exc:
                raise LLMProviderError("deepseek", str(exc)) from exc

            if response.status_code in (429, 503) and attempt < max_retries - 1:
                time.sleep(base_delay * (2 ** attempt))
                continue

            if response.status_code >= 400:
                try:
                    err_body = response.json()
                    err_msg = (
                        err_body.get("error", {}).get("message")
                        if isinstance(err_body.get("error"), dict)
                        else str(err_body)
                    )
                except Exception:
                    err_msg = response.text or f"HTTP {response.status_code}"
                raise LLMProviderError("deepseek", err_msg or f"HTTP {response.status_code}")

            return response.json()

        raise LLMProviderError("deepseek", "Falha após múltiplas tentativas na API da DeepSeek.")

    def gerar_resposta(
        self,
        system_prompt: str,
        pergunta: str,
        buscar_dados_erp: ToolCallback,
    ) -> str:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": pergunta},
        ]

        first_payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.0,
            "tools": [DEEPSEEK_ERP_TOOL_SCHEMA],
            "tool_choice": "auto",
        }

        with httpx.Client(timeout=self.timeout) as client:
            first_data = self._post_chat_completions(client, first_payload)
            choices = first_data.get("choices") or []
            if not choices:
                return "Não foi possível gerar uma resposta comercial no momento."

            assistant_msg = choices[0].get("message") or {}
            tool_calls = assistant_msg.get("tool_calls") or []

            if not tool_calls:
                return assistant_msg.get("content") or "Não foi possível gerar uma resposta comercial no momento."

            messages.append(assistant_msg)

            for tool_call in tool_calls:
                fn_info = tool_call.get("function") or {}
                fn_name = fn_info.get("name")
                raw_args = fn_info.get("arguments") or "{}"

                try:
                    parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except json.JSONDecodeError:
                    parsed_args = {}

                skus = parsed_args.get("skus", []) if isinstance(parsed_args, dict) else []
                if not isinstance(skus, list):
                    skus = [str(skus)]

                if fn_name == "buscar_dados_erp":
                    resultado_tool = buscar_dados_erp([str(s) for s in skus])
                else:
                    resultado_tool = []

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.get("id", "call_0"),
                        "content": json.dumps(resultado_tool, ensure_ascii=False),
                    }
                )

            second_payload: dict[str, Any] = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.0,
            }
            second_data = self._post_chat_completions(client, second_payload)
            second_choices = second_data.get("choices") or []
            if not second_choices:
                return "Não foi possível gerar uma resposta comercial no momento."

            final_msg = second_choices[0].get("message") or {}
            return final_msg.get("content") or "Não foi possível gerar uma resposta comercial no momento."


class GeminiProvider:
    """Adaptador concreto para o Google GenAI SDK (modelo mínimo: gemini-3.8-flash)."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-3.8-flash",
        timeout_ms: int = 15000,
    ) -> None:
        if "2.5" in model or "1.5" in model or "1.0" in model:
            raise ValueError(
                f"Modelo '{model}' proibido pela Constituição. Utilize no mínimo 'gemini-3.8-flash'."
            )
        self.api_key = api_key
        self.model = model
        self.timeout_ms = timeout_ms

    def gerar_resposta(
        self,
        system_prompt: str,
        pergunta: str,
        buscar_dados_erp: ToolCallback,
    ) -> str:
        client = genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(timeout=self.timeout_ms),
        )

        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=pergunta,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.0,
                        tools=[buscar_dados_erp],
                    ),
                )
                return response.text or "Não foi possível gerar uma resposta comercial no momento."
            except httpx.TimeoutException as exc:
                raise LLMTimeoutError(
                    "gemini",
                    "Timeout ao aguardar resposta da API do Google Gemini.",
                ) from exc
            except genai_errors.APIError as exc:
                is_overloaded = "high demand" in str(exc).lower() or getattr(exc, "code", None) in (503, 429)
                if is_overloaded and attempt < max_retries - 1:
                    time.sleep(base_delay * (2 ** attempt))
                    continue
                msg = getattr(exc, "message", None) or str(exc)
                raise LLMProviderError("gemini", msg) from exc

        raise LLMProviderError("gemini", "Falha após múltiplas tentativas na API do Gemini.")


def _obter_chave_deepseek() -> str | None:
    """Obtém a chave da DeepSeek de DEEPSEEK_API_KEY ou fallback de GEMINI_API_KEY caso comece com 'sk-'."""
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    if deepseek_key:
        return deepseek_key
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and gemini_key.strip().startswith("sk-"):
        return gemini_key.strip()
    return None


def _resolver_nome_provedor() -> str:
    """Resolve qual provedor deve ser utilizado com base nas variáveis de ambiente."""
    explicit = os.getenv("LLM_PROVIDER")
    if explicit:
        return explicit.strip().lower()
    if _obter_chave_deepseek():
        return "deepseek"
    return "gemini"


def validar_configuracao_llm() -> str:
    """Validação fail-fast no startup da aplicação para garantir provedor e chave válidos."""
    provider_name = _resolver_nome_provedor()
    if provider_name not in PROVEDORES_SUPORTADOS:
        raise RuntimeError(
            f"Provedor LLM_PROVIDER='{provider_name}' inválido. "
            f"Opções suportadas: {', '.join(PROVEDORES_SUPORTADOS)}."
        )

    if provider_name == "deepseek":
        if not _obter_chave_deepseek():
            raise RuntimeError(
                "Variável de ambiente DEEPSEEK_API_KEY não encontrada para o provedor 'deepseek'. "
                "Configure-a antes de iniciar a API."
            )
    elif provider_name == "gemini":
        if not os.getenv("GEMINI_API_KEY"):
            raise RuntimeError(
                "Variável de ambiente GEMINI_API_KEY não encontrada para o provedor 'gemini'. "
                "Configure-a antes de iniciar a API."
            )

    return provider_name


def get_llm_provider() -> LLMProvider:
    """Factory de Injeção de Dependência (FastAPI Depends) para instanciar o provedor ativo."""
    provider_name = validar_configuracao_llm()

    if provider_name == "deepseek":
        api_key = _obter_chave_deepseek() or ""
        model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        return DeepSeekProvider(api_key=api_key, model=model, base_url=base_url, timeout=15.0)

    api_key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    return GeminiProvider(api_key=api_key, model=model, timeout_ms=15000)
