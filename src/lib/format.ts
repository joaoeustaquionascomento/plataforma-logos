export const brl = (value: number | string | null | undefined) =>
  value == null
    ? "-"
    : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dateBR = (value: string | null | undefined) => {
  if (!value) return "-";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const payableStatusLabel: Record<string, string> = {
  to_schedule: "A agendar",
  awaiting_bank_approval: "Aguardando aprovação no banco",
  scheduled: "Aprovado, aguardando débito",
  paid: "Pago",
  confirmed: "Pago e conferido no extrato",
  canceled: "Cancelado",
};

export const documentStatusLabel: Record<string, string> = {
  received: "Recebido",
  extracting: "Lendo...",
  extracted: "Lido pelo agente",
  needs_review: "Precisa de revisão",
  processed: "Processado",
  discarded: "Descartado",
  error: "Erro",
};

export const sourceLabel: Record<string, string> = {
  portal: "Portal",
  email: "E-mail",
  drive: "Google Drive",
  whatsapp: "WhatsApp",
  analyst: "Analista",
};

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Data (AAAA-MM-DD) daqui a N dias. */
export function isoDateInDays(days: number) {
  return new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
}
