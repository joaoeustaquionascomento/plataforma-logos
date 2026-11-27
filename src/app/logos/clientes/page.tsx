import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { createClientAction } from "./actions";

export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: plans }] = await Promise.all([
    supabase.from("clients").select("id, name, cnpj, inbox_slug, active").order("name"),
    supabase.from("plans").select("code, name, monthly_price").order("sort_order"),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="card">
        <h1 className="mb-4 text-2xl font-bold">Clientes</h1>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Nome</th>
              <th>CNPJ</th>
              <th>E-mail de entrada</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients?.map((c) => (
              <tr key={c.id}>
                <td className="py-2">
                  <Link className="font-medium text-logos-700 hover:underline" href={`/logos/clientes/${c.id}`}>
                    {c.name}
                  </Link>
                </td>
                <td>{c.cnpj ?? "-"}</td>
                <td className="text-gray-600">
                  {c.inbox_slug}@{env.inboxDomain()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clients?.length && <p className="text-sm text-gray-500">Nenhum cliente cadastrado ainda.</p>}
      </section>

      <section className="card h-fit">
        <h2 className="mb-3 font-semibold">Novo cliente</h2>
        <ActionForm action={createClientAction} submitLabel="Cadastrar">
          <div>
            <label className="label">Nome</label>
            <input className="input" name="name" required />
          </div>
          <div>
            <label className="label">CNPJ</label>
            <input className="input" name="cnpj" />
          </div>
          <div>
            <label className="label">Plano (interno)</label>
            <select className="input" name="plan_code" defaultValue="">
              <option value="">Definir depois</option>
              {plans?.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
