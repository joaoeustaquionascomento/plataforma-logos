import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReadable, readDocument, DocumentReadError } from "@/lib/agents/document-reader";

export type IncomingFile = {
  fileName: string;
  mimeType: string;
  bytes: ArrayBuffer;
};

export type IngestInput = {
  clientId: string;
  source: "portal" | "email" | "drive" | "whatsapp" | "analyst";
  file: IncomingFile;
  sender?: string | null;
  note?: string | null;
  uploadedBy?: string | null;
};

const MAX_BYTES = 20 * 1024 * 1024;

function safeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-120);
}

/** Guarda o arquivo, registra o documento e devolve o id. A leitura pelo agente é feita depois. */
export async function ingestDocument(input: IngestInput): Promise<string> {
  if (input.file.bytes.byteLength > MAX_BYTES) throw new Error("Arquivo maior que 20 MB.");
  const db = createAdminClient();
  const path = `${input.clientId}/${randomUUID()}-${safeName(input.file.fileName)}`;

  const upload = await db.storage
    .from("documents")
    .upload(path, input.file.bytes, { contentType: input.file.mimeType, upsert: false });
  if (upload.error) throw new Error(`Falha ao guardar o arquivo: ${upload.error.message}`);

  const { data, error } = await db
    .from("documents")
    .insert({
      client_id: input.clientId,
      source: input.source,
      storage_path: path,
      file_name: input.file.fileName,
      mime_type: input.file.mimeType,
      size_bytes: input.file.bytes.byteLength,
      sender: input.sender ?? null,
      note: input.note ?? null,
      uploaded_by: input.uploadedBy ?? null,
      status: isReadable(input.file.mimeType) ? "received" : "needs_review",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Falha ao registrar o documento: ${error.message}`);
  return data.id as string;
}

/** O agente lê o documento e grava os campos. Erros deixam o documento para revisão manual. */
export async function extractDocument(documentId: string): Promise<void> {
  const db = createAdminClient();
  const { data: doc, error } = await db
    .from("documents")
    .select("id, storage_path, mime_type, note, status")
    .eq("id", documentId)
    .single();
  if (error || !doc) throw new Error("Documento não encontrado.");
  if (!isReadable(doc.mime_type)) return;

  await db.from("documents").update({ status: "extracting", extraction_error: null }).eq("id", doc.id);
  try {
    const file = await db.storage.from("documents").download(doc.storage_path);
    if (file.error) throw new Error(file.error.message);
    const extracted = await readDocument({
      bytes: await file.data.arrayBuffer(),
      mimeType: doc.mime_type,
      note: doc.note,
    });
    await db
      .from("documents")
      .update({
        status: extracted.confidence === "baixa" ? "needs_review" : "extracted",
        kind: extracted.kind,
        extracted,
      })
      .eq("id", doc.id);
  } catch (err) {
    const message =
      err instanceof DocumentReadError ? err.message : "Falha na leitura automática. Revisão manual necessária.";
    console.error("extractDocument", doc.id, err);
    await db.from("documents").update({ status: "needs_review", extraction_error: message }).eq("id", doc.id);
  }
}
