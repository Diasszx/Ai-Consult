const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Sob consulta";
  }
  return brlFormatter.format(value);
}

/**
 * Aplica máscara de telefone/WhatsApp brasileiro dinamicamente:
 * (XX) XXXXX-XXXX para celular (11 dígitos)
 * (XX) XXXX-XXXX para fixo (10 dígitos)
 */
export function formatPhoneNumberBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length > 0 ? `(${digits}` : "";
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

