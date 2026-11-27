import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractDocument, ingestDocument } from "@/lib/documents/ingest";
import { isAuthorizedInbound } from "@/lib/inbound-auth";

/**
 * Recebe e-mails já convertidos em JSON pelo serviço de entrada
 * (ver workers/email-inbound). Cada cliente tem um endereço próprio:
 * <inbox_slug>@<INBOX_DOMAIN>. Cada anexo vira um documento.
 */
const InboundEmail = z.object({
  to: z.array(z.string()).min(1),
  from: z.string(),
  subject: z.string().optional().default(""),
  text: z.string().optional().default(""),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        contentBase64: z.string(),
      }),
    )
    .default([]),
});

export async function POST(request: Request) {
  if (!isAuthorizedInbound(request)) {
    return Response.json({ error: "não autorizado" }, { status: 401 });
  }
  const parsed = InboundEmail.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "formato inválido" }, { status: 400 });
  }
  const email = parsed.data;

  const slugs = email.to.map((address) => address.split("@")[0]?.trim().toLowerCase()).filter(Boolean);
  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .in("inbox_slug", slugs)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!client) {
    return Response.json({ error: "nenhum cliente com esse endereço" }, { status: 404 });
  }

  const note = [email.subject, email.text.slice(0, 500)].filter(Boolean).join("\n");
  const ids: string[] = [];
  for (const attachment of email.attachments) {
    const bytes = Buffer.from(attachment.contentBase64, "base64");
    ids.push(
      await ingestDocument({
        clientId: client.id,
        source: "email",
        sender: email.from,
        note,
        file: {
          fileName: attachment.filename,
          mimeType: attachment.contentType,
          bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        },
      }),
    );
  }

  after(async () => {
    for (const id of ids) await extractDocument(id);
  });

  return Response.json({ received: ids.length });
}
