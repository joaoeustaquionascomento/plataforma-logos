import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/** O que o agente devolve para cada documento financeiro. */
export const ExtractedDocument = z.object({
  kind: z
    .enum(["boleto", "nota_fiscal", "recibo", "comprovante", "fatura", "outro"])
    .describe("Tipo do documento"),
  supplier_name: z.string().nullable().describe("Nome do favorecido, emissor ou fornecedor"),
  supplier_document: z.string().nullable().describe("CNPJ ou CPF do favorecido, só dígitos"),
  payer_name: z.string().nullable().describe("Nome do pagador ou tomador, se aparecer"),
  payer_document: z.string().nullable().describe("CNPJ ou CPF do pagador, só dígitos"),
  amount: z.number().nullable().describe("Valor a pagar ou pago, em reais"),
  due_date: z.string().nullable().describe("Vencimento no formato AAAA-MM-DD"),
  payment_date: z.string().nullable().describe("Data do pagamento, se for comprovante, AAAA-MM-DD"),
  barcode: z.string().nullable().describe("Linha digitável do boleto, só dígitos"),
  pix_key: z.string().nullable().describe("Chave Pix ou código Pix copia e cola, se houver"),
  invoice_number: z.string().nullable().describe("Número da nota fiscal ou fatura"),
  description: z.string().nullable().describe("Descrição curta do que está sendo pago"),
  suggested_category: z
    .string()
    .nullable()
    .describe("Categoria sugerida em português, por exemplo: Aluguel, Energia, Fornecedores, Impostos, Serviços"),
  confidence: z.enum(["alta", "media", "baixa"]).describe("Confiança na leitura"),
  notes: z.string().nullable().describe("Algo que o analista precisa conferir"),
});
export type ExtractedDocument = z.infer<typeof ExtractedDocument>;

const SYSTEM = `Você lê documentos financeiros de pequenas e médias empresas brasileiras para a LógosBPO, uma empresa de BPO financeiro.
Extraia os campos pedidos exatamente como aparecem no documento. Não invente: se um campo não estiver no documento, devolva null.
Valores em reais como número (1.234,56 vira 1234.56). Datas em AAAA-MM-DD. CNPJ, CPF e linha digitável só com dígitos.
Use "baixa" em confidence quando o documento estiver ilegível, cortado ou ambíguo, e explique em notes o que conferir.`;

const SUPPORTED_IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof SUPPORTED_IMAGES)[number];

export function isReadable(mimeType: string) {
  return mimeType === "application/pdf" || (SUPPORTED_IMAGES as readonly string[]).includes(mimeType);
}

export class DocumentReadError extends Error {}

/** Lê um PDF ou foto de documento e devolve os campos estruturados. */
export async function readDocument(file: { bytes: ArrayBuffer; mimeType: string; note?: string | null }) {
  if (!isReadable(file.mimeType)) {
    throw new DocumentReadError(`Formato não suportado: ${file.mimeType}`);
  }
  const data = Buffer.from(file.bytes).toString("base64");
  const source: Anthropic.ContentBlockParam =
    file.mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.mimeType as ImageType, data } };

  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: zodOutputFormat(ExtractedDocument) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          source,
          {
            type: "text",
            text: file.note
              ? `Observação de quem enviou: ${file.note}\n\nExtraia os campos deste documento.`
              : "Extraia os campos deste documento.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new DocumentReadError("O modelo não leu este documento. Revisão manual necessária.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new DocumentReadError("Leitura incompleta. Revisão manual necessária.");
  }
  return response.parsed_output;
}
