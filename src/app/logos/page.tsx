import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brl, dateBR, isoDateInDays, payableStatusLabel } from "@/lib/format";
import { StatusBadge, payableTone } from "@/components/status-badge";

export default async function QueuePage() {
  const supabase = await createClient();
  const in7days = isoDateInDays(7);

  const [docs, payables] = await Promise.all([
    supabase
      .from("documents")
      .select("id, file_name, status, created_at, clients(name)")
      .in("status", ["extracted", "needs_review", "received"])
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("payables")
      .select("id, supplier_name, amount, due_date, status, clients(name)")
      .in("status", ["to_schedule", "awaiting_bank_approval", "scheduled"])
      .lte("due_date", in7days)
      .order("due_date", { ascending: true })
      .limit(50),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Fila do dia</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold">Documentos para conferir ({docs.data?.length ?? 0})</h2>
        {docs.data?.length ? (
          <ul className="divide-y">
            {docs.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <strong>{(d.clients as unknown as { name: string } | null)?.name}</strong> · {d.file_name}
                </span>
                <Link className="text-logos-700 hover:underline" href={`/logos/documentos/${d.id}`}>
                  Conferir
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nada para conferir.</p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Pagamentos vencendo em até 7 dias</h2>
        {payables.data?.length ? (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-1">Cliente</th>
                <th>Favorecido</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payables.data.map((p) => (
                <tr key={p.id}>
                  <td className="py-2">{(p.clients as unknown as { name: string } | null)?.name}</td>
                  <td>{p.supplier_name}</td>
                  <td>{brl(p.amount)}</td>
                  <td>{dateBR(p.due_date)}</td>
                  <td>
                    <StatusBadge label={payableStatusLabel[p.status]} tone={payableTone(p.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500">Nenhum pagamento pendente nos próximos 7 dias.</p>
        )}
      </section>
    </div>
  );
}
