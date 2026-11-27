"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extractDocument } from "@/lib/documents/ingest";

export type FormState = { error?: string; ok?: string };

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  // Aceita "1.234,56" e "1234.56"
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Analista confere os campos lidos pelo agente e cria a conta a pagar. */
export async function createPayableAction(_prev: FormState, form: FormData): Promise<FormState> {
  const profile = await requireStaff();
  const documentId = String(form.get("document_id"));
  const clientId = String(form.get("client_id"));
  const amount = parseAmount(form.get("amount"));
  const dueDate = String(form.get("due_date") ?? "");
  const supplierName = String(form.get("supplier_name") ?? "").trim();
  if (!supplierName || !amount || !dueDate) {
    return { error: "Favorecido, valor e vencimento são obrigatórios." };
  }

  const supabase = await createClient();
  const { data: payable, error } = await supabase
    .from("payables")
    .insert({
      client_id: clientId,
      document_id: documentId,
      supplier_name: supplierName,
      supplier_document: String(form.get("supplier_document") ?? "").replace(/\D/g, "") || null,
      description: String(form.get("description") ?? "").trim() || null,
      category: String(form.get("category") ?? "").trim() || null,
      amount,
      due_date: dueDate,
      barcode: String(form.get("barcode") ?? "").replace(/\D/g, "") || null,
      pix_key: String(form.get("pix_key") ?? "").trim() || null,
      bank_account_id: String(form.get("bank_account_id") ?? "") || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase
    .from("documents")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", documentId);
  await supabase.from("events").insert({
    client_id: clientId,
    actor: profile.id,
    entity: "payable",
    entity_id: payable.id,
    action: "created_from_document",
    details: { document_id: documentId },
  });
  revalidatePath("/logos");
  redirect("/logos/documentos");
}

export async function discardDocumentAction(form: FormData) {
  await requireStaff();
  const id = String(form.get("document_id"));
  const supabase = await createClient();
  await supabase.from("documents").update({ status: "discarded", processed_at: new Date().toISOString() }).eq("id", id);
  redirect("/logos/documentos");
}

export async function rereadDocumentAction(form: FormData) {
  await requireStaff();
  const id = String(form.get("document_id"));
  after(() => extractDocument(id));
  revalidatePath(`/logos/documentos/${id}`);
}
