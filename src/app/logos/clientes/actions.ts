"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/format";

export type FormState = { error?: string; ok?: string };

const digits = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\D/g, "") || null;

export async function createClientAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const name = String(form.get("name") ?? "").trim();
  const planCode = String(form.get("plan_code") ?? "");
  if (!name) return { error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const base = slugify(name) || "cliente";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { count } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("inbox_slug", slug);
    if (!count) break;
    slug = `${base}-${i}`;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ name, cnpj: digits(form.get("cnpj")), inbox_slug: slug })
    .select("id")
    .single();
  if (error) return { error: `Não foi possível criar: ${error.message}` };

  if (planCode) {
    await supabase.from("client_contracts").insert({ client_id: data.id, plan_code: planCode });
  }
  redirect(`/logos/clientes/${data.id}`);
}

export async function updateClientAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const id = String(form.get("id"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: String(form.get("name") ?? "").trim(),
      cnpj: digits(form.get("cnpj")),
      drive_folder_id: String(form.get("drive_folder_id") ?? "").trim() || null,
      whatsapp_number: digits(form.get("whatsapp_number")),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  const planCode = String(form.get("plan_code") ?? "");
  if (planCode) {
    await supabase.from("client_contracts").upsert({ client_id: id, plan_code: planCode });
  }
  revalidatePath(`/logos/clientes/${id}`);
  return { ok: "Salvo." };
}

export async function addBankAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const clientId = String(form.get("client_id"));
  const bankName = String(form.get("bank_name") ?? "").trim();
  if (!bankName) return { error: "Informe o banco." };
  const supabase = await createClient();
  const { error } = await supabase.from("bank_accounts").insert({
    client_id: clientId,
    bank_name: bankName,
    agency: String(form.get("agency") ?? "").trim() || null,
    account_number: String(form.get("account_number") ?? "").trim() || null,
    label: String(form.get("label") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/logos/clientes/${clientId}`);
  return { ok: "Conta adicionada." };
}

/** Convida um usuário do cliente por e-mail. Ele define a senha pelo link recebido. */
export async function inviteClientUserAction(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const clientId = String(form.get("client_id"));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const fullName = String(form.get("full_name") ?? "").trim();
  if (!email) return { error: "Informe o e-mail." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName || email },
  });
  if (error) return { error: `Convite não enviado: ${error.message}` };

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, full_name: fullName || email, role: "client", client_id: clientId });
  if (profileError) return { error: profileError.message };

  revalidatePath(`/logos/clientes/${clientId}`);
  return { ok: `Convite enviado para ${email}.` };
}
