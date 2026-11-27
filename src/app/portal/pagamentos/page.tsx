import { requireClientUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { brl, dateBR, payableStatusLabel } from "@/lib/format";
import { StatusBadge, payableTone } from "@/components/status-badge";

export default async function PaymentsPage() {
  const profile = await requireClientUser();
  const supabase = await createClient();
  const { data: payables } = await supabase
    .from("payables")
    .select("id, supplier_name, amount, due_date, status, receipt:documents!payables_receipt_document_id_fkey(storage_path)")
    .eq("client_id", profile.client_id)
    .neq("status", "canceled")
    .order("due_date", { ascending: false })
    .limit(200);

  const receiptLinks = new Map<string, string>();
  await Promise.all(
    (payables ?? []).map(async (p) => {
      const receipt = p.receipt as unknown as { storage_path: string } | null;
      if (!receipt) return;
      const { data } = await supabase.storage.from("documents").createSignedUrl(receipt.storage_path, 600);
      if (data) receiptLinks.set(p.id, data.signedUrl);
    }),
  );

  return (
    <div className="card">
      <h1 className="mb-4 text-xl font-bold">Pagamentos</h1>
      <p className="mb-4 text-sm text-gray-500">
        Quando a Logos agenda um pagamento, ele aparece como &quot;Aguardando aprovação no banco&quot;. Aprove direto no
        app do seu banco.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1">Vencimento</th>
              <th>Favorecido</th>
              <th>Valor</th>
              <th>Situação</th>
              <th>Comprovante</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payables?.map((p) => (
              <tr key={p.id}>
                <td className="py-2">{dateBR(p.due_date)}</td>
                <td>{p.supplier_name}</td>
                <td>{brl(p.amount)}</td>
                <td>
                  <StatusBadge label={payableStatusLabel[p.status]} tone={payableTone(p.status)} />
                </td>
                <td>
                  {receiptLinks.get(p.id) ? (
                    <a className="text-logos-700 hover:underline" href={receiptLinks.get(p.id)} target="_blank">
                      Ver
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!payables?.length && <p className="mt-3 text-sm text-gray-500">Nenhum pagamento ainda.</p>}
    </div>
  );
}
