import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";

type Row = {
  client_id: string;
  client_name: string;
  plan_code: string | null;
  cp_limit: number | null;
  cr_limit: number | null;
  account_limit: number | null;
  cp_count: number;
  cr_count: number;
  account_count: number;
};

function Usage({ used, limit }: { used: number; limit: number | null }) {
  if (limit == null) return <span>{used}</span>;
  const over = used > limit;
  const near = !over && used >= limit * 0.8;
  return (
    <span className={over ? "font-semibold text-red-600" : near ? "text-amber-600" : ""}>
      {used} / {limit}
    </span>
  );
}

/** Medidor de volume: só a equipe Logos vê. */
export default async function VolumePage() {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: plans }] = await Promise.all([
    supabase.rpc("volume_this_month"),
    supabase.from("plans").select("code, name, monthly_price, cp_limit, cr_limit, account_limit").order("sort_order"),
  ]);
  const planName = (code: string | null) => plans?.find((p) => p.code === code)?.name ?? "Sem plano";

  function suggestion(r: Row) {
    const fit = plans?.find(
      (p) => p.cp_limit >= r.cp_count && p.cr_limit >= r.cr_count && p.account_limit >= r.account_count,
    );
    if (!fit) return "Proposta personalizada";
    return fit.code === r.plan_code ? "-" : `${fit.name} (${brl(fit.monthly_price)})`;
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Volume x plano</h1>
      <p className="mb-4 text-sm text-gray-500">
        Lançamentos deste mês por cliente. Uso interno: o cliente não vê esta tela.
      </p>
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="py-1">Cliente</th>
            <th>Plano</th>
            <th>CP no mês</th>
            <th>CR no mês</th>
            <th>Contas</th>
            <th>Plano que caberia</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {(rows as Row[] | null)?.map((r) => (
            <tr key={r.client_id}>
              <td className="py-2">{r.client_name}</td>
              <td>{planName(r.plan_code)}</td>
              <td><Usage used={r.cp_count} limit={r.cp_limit} /></td>
              <td><Usage used={r.cr_count} limit={r.cr_limit} /></td>
              <td><Usage used={r.account_count} limit={r.account_limit} /></td>
              <td>{suggestion(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
