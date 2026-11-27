import Link from "next/link";
import { requireClientUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dateBR, isoDateInDays, payableStatusLabel } from "@/lib/format";
import { StatusBadge, payableTone } from "@/components/status-badge";

export default async function PortalHome() {
  const profile = await requireClientUser();
  const supabase = await createClient();
  const in7days = isoDateInDays(7);

  const [{ data: upcoming }, { count: awaiting }, { count: questions }] = await Promise.all([
    supabase
      .from("payables")
      .select("id, supplier_name, amount, due_date, status")
      .eq("client_id", profile.client_id)
      .in("status", ["to_schedule", "awaiting_bank_approval", "scheduled"])
      .lte("due_date", in7days)
      .order("due_date"),
    supabase
      .from("payables")
      .select("id", { count: "exact", head: true })
      .eq("client_id", profile.client_id)
      .eq("status", "awaiting_bank_approval"),
    supabase
      .from("client_questions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", profile.client_id)
      .is("answered_at", null),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-gray-500">Vencendo em 7 dias</p>
          <p className="text-2xl font-bold">{upcoming?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Aguardando sua aprovação no banco</p>
          <p className={`text-2xl font-bold ${awaiting ? "text-amber-600" : ""}`}>{awaiting ?? 0}</p>
        </div>
        <Link href="/portal/pendencias" className="card hover:border-logos-500">
          <p className="text-sm text-gray-500">Perguntas da Logos</p>
          <p className="text-2xl font-bold">{questions ?? 0}</p>
        </Link>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Próximos pagamentos</h2>
          <Link href="/portal/enviar" className="btn-primary">Enviar documento</Link>
        </div>
        {upcoming?.length ? (
          <ul className="divide-y text-sm">
            {upcoming.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {dateBR(p.due_date)} · {p.supplier_name} · <strong>{brl(p.amount)}</strong>
                </span>
                <StatusBadge label={payableStatusLabel[p.status]} tone={payableTone(p.status)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nada vencendo nos próximos 7 dias.</p>
        )}
      </section>
    </div>
  );
}
