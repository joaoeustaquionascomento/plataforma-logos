/**
 * Cloudflare Email Worker: recebe os e-mails enviados para <cliente>@docs.logosbpo.com.br,
 * converte em JSON e repassa para a plataforma (/api/inbound/email).
 * Configuração: Cloudflare > Email Routing > rota "catch-all" para este worker.
 * Variáveis: PLATFORM_URL e INBOUND_WEBHOOK_SECRET (secret).
 */
import PostalMime from "postal-mime";

interface Env {
  PLATFORM_URL: string;
  INBOUND_WEBHOOK_SECRET: string;
}

function toBase64(content: ArrayBuffer | Uint8Array | string): string {
  if (typeof content === "string") return btoa(unescape(encodeURIComponent(content)));
  let binary = "";
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const worker = {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    const parsed = await PostalMime.parse(message.raw);
    const attachments = parsed.attachments
      .filter((a) => a.disposition !== "inline" || a.mimeType === "application/pdf")
      .map((a) => ({
        filename: a.filename ?? "anexo",
        contentType: a.mimeType,
        contentBase64: toBase64(a.content),
      }));

    if (attachments.length === 0) {
      message.setReject("Nenhum anexo encontrado. Envie o boleto ou a nota em PDF ou foto.");
      return;
    }

    const response = await fetch(`${env.PLATFORM_URL}/api/inbound/email`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-logos-secret": env.INBOUND_WEBHOOK_SECRET },
      body: JSON.stringify({
        to: [message.to],
        from: message.from,
        subject: parsed.subject ?? "",
        text: parsed.text ?? "",
        attachments,
      }),
    });

    if (response.status === 404) {
      message.setReject("Endereço não cadastrado na LógosBPO.");
    } else if (!response.ok) {
      throw new Error(`Plataforma respondeu ${response.status}`);
    }
  },
} satisfies ExportedHandler<Env>;

export default worker;
