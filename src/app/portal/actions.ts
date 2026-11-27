"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireClientUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extractDocument, ingestDocument } from "@/lib/documents/ingest";

export type FormState = { error?: string; ok?: string };

/** Cliente envia um ou mais documentos pelo portal. */
export async function uploadDocumentsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const profile = await requireClientUser();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Escolha ao menos um arquivo." };
  const note = String(form.get("note") ?? "").trim() || null;

  const ids: string[] = [];
  try {
    for (const file of files) {
      ids.push(
        await ingestDocument({
          clientId: profile.client_id,
          source: "portal",
          uploadedBy: profile.id,
          note,
          file: { fileName: file.name, mimeType: file.type || "application/octet-stream", bytes: await file.arrayBuffer() },
        }),
      );
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falha no envio." };
  }

  after(async () => {
    for (const id of ids) await extractDocument(id);
  });
  revalidatePath("/portal/enviar");
  return { ok: `${ids.length} documento(s) recebido(s). A Logos já foi avisada.` };
}

export async function answerQuestionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const profile = await requireClientUser();
  const id = String(form.get("question_id"));
  const answer = String(form.get("answer") ?? "").trim();
  if (!answer) return { error: "Escreva a resposta." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_questions")
    .update({ answer, answered_by: profile.id, answered_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", profile.client_id);
  if (error) return { error: error.message };
  revalidatePath("/portal/pendencias");
  return { ok: "Resposta enviada." };
}
