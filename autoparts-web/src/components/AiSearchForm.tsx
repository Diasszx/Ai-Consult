import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { consultaSchema, type ConsultaFormValues } from "../schemas/consultaSchema";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const SUGESTOES_RAPIDAS = [
  "Amortecedor dianteiro do Gol G5 2012 1.0",
  "Tem amortecedor pro Gol G5 2011?",
  "Pastilha de freio do Civic G10 2019",
  "Jogo de vela do Novo Uno 2012 Fire Evo",
];

interface AiSearchFormProps {
  isLoading: boolean;
  showSuggestions: boolean;
  onSubmitPergunta: (pergunta: string) => Promise<void>;
}

export function AiSearchForm({
  isLoading,
  showSuggestions,
  onSubmitPergunta,
}: AiSearchFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ConsultaFormValues>({
    resolver: zodResolver(consultaSchema),
    defaultValues: {
      pergunta: "",
    },
  });

  const onValidSubmit = async (values: ConsultaFormValues) => {
    const perguntaLimpa = values.pergunta;
    reset();
    await onSubmitPergunta(perguntaLimpa);
  };

  const handleQuickPrompt = async (sugestao: string) => {
    if (isLoading) return;
    setValue("pergunta", sugestao, { shouldValidate: true });
    reset();
    await onSubmitPergunta(sugestao);
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit(onValidSubmit)}
        className="relative flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-shadow focus-within:border-zinc-400 focus-within:shadow-md"
        noValidate
      >
        <div className="pl-2.5 text-zinc-400">
          <Sparkles className="h-4 w-4" />
        </div>

        <Input
          {...register("pergunta")}
          disabled={isLoading}
          autoFocus
          placeholder="Pergunte à IA sobre peça, veículo ou ano (ex: amortecedor Gol G5 2012)..."
          aria-invalid={Boolean(errors.pergunta)}
          className="h-10 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />

        <Button
          type="submit"
          size="icon"
          disabled={isLoading}
          aria-label="Consultar com IA"
          className="h-9 w-9 shrink-0 rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </form>

      {errors.pergunta && (
        <p role="alert" className="px-1 text-xs font-medium text-red-600">
          {errors.pergunta.message}
        </p>
      )}

      {showSuggestions && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="mr-1 text-xs text-zinc-400">Experimente:</span>
          {SUGESTOES_RAPIDAS.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              disabled={isLoading}
              onClick={() => void handleQuickPrompt(sugestao)}
              className="rounded-full border border-zinc-200/80 bg-white px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            >
              {sugestao}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
