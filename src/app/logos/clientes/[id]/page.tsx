import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { addBankAccountAction, inviteClientUserAction, updateClientAction } from "../actions";

export default async function ClientDetailPage({ params }: PageProps<"/logos/clientes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: client }, { data: contract }, { data: plans }, { data: accounts }, { data: users }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("client_contracts").select("plan_code").eq("client_id", id).maybeSingle(),
      supabase.from("plans").select("code, name").order("sort_order"),
      supabase.from("bank_accounts").select("*").eq("client_id", id).order("created_at"),
      supabase.from("profiles").select("id, full_name").eq("client_id", id),
    ]);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <p className="text-sm text-gray-600">
          Envio de documentos por e-mail: <strong>{client.inbox_slug}@{env.inboxDomain()}</strong>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Dados</h2>
          <ActionForm action={updateClientAction} submitLabel="Salvar">
            <input type="hidden" name="id" value={client.id} />
            <div>
              <label className="label">Nome</label>
              <input className="input" name="name" defaultValue={client.name} required />
            </div>
            <div>
              <label className="label">CNPJ</label>
              <input className="input" name="cnpj" defaultValue={client.cnpj ?? ""} />
            </div>
            <div>
              <label className="label">Pasta do Google Drive (ID)</label>
              <input className="input" name="drive_folder_id" defaultValue={client.drive_folder_id ?? ""} />
            </div>
            <div>
              <label className="label">WhatsApp do cliente</label>
              <input className="input" name="whatsapp_number" defaultValue={client.whatsapp_number ?? ""} />
            </div>
            <div>
              <label className="label">Plano (interno, o cliente não vê)</label>
              <select className="input" name="plan_code" defaultValue={contract?.plan_code ?? ""}>
                <option value="">Sem plano</option>
                {plans?.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </ActionForm>
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-semibold">Contas bancárias</h2>
            <ul className="mb-4 space-y-1 text-sm">
              {accounts?.map((a) => (
                <li key={a.id}>
                  {a.bank_name} · ag. {a.agency ?? "-"} · cc {a.account_number ?? "-"} {a.label ? `(${a.label})` : ""}
                </li>
              ))}
              {!accounts?.length && <li className="text-gray-500">Nenhuma conta cadastrada.</li>}
            </ul>
            <ActionForm action={addBankAccountAction} submitLabel="Adicionar conta" className="grid grid-cols-2 gap-2">
              <input type="hidden" name="client_id" value={client.id} />
              <input className="input" name="bank_name" placeholder="Banco (ex.: Itaú)" required />
              <input className="input" name="label" placeholder="Apelido" />
              <input className="input" name="agency" placeholder="Agência" />
              <input className="input" name="account_number" placeholder="Conta" />
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="mb-3 font-semibold">Acessos do cliente ao portal</h2>
            <ul className="mb-4 space-y-1 text-sm">
              {users?.map((u) => <li key={u.id}>{u.full_name}</li>)}
              {!users?.length && <li className="text-gray-500">Ninguém convidado ainda.</li>}
            </ul>
            <ActionForm action={inviteClientUserAction} submitLabel="Enviar convite" className="grid grid-cols-2 gap-2">
              <input type="hidden" name="client_id" value={client.id} />
              <input className="input" name="full_name" placeholder="Nome" />
              <input className="input" name="email" type="email" placeholder="E-mail" required />
            </ActionForm>
          </section>
        </div>
      </div>
    </div>
  );
}
