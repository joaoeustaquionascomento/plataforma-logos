import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { StatusBadge, documentTone } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { documentStatusLabel, sourceLabel } from "@/lib/format";
import type { ExtractedDocument } from "@/lib/agents/document-reader";
import { createPayableAction, discardDocumentAction, rereadDocumentAction } from "../actions";

export default async function DocumentReviewPage({ params }: PageProps<"/logos/documentos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("*, clients(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!doc) notFound();

  const client = doc.clients as unknown as { id: string; name: string };
  const [{ data: signed }, { data: accounts }] = await Promise.all([
    supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60 * 10),
    supabase.from("bank_accounts").select("id, bank_name, label").eq("client_id", client.id),
  ]);
  const ex = (doc.extracted ?? {}) as Partial<ExtractedDocument>;
  const isImage = doc.mime_type.startsWith("image/");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{doc.file_name}</h1>
          <p className="text-sm text-gray-600">
            {client.name} · via {sourceLabel[doc.source]}
            {doc.sender ? ` (${doc.sender})` : ""}
          </p>
          {doc.note && <p className="mt-1 text-sm text-gray-600">Observação: {doc.note}</p>}
        </div>
        <StatusBadge label={documentStatusLabel[doc.status]} tone={documentTone(doc.status)} />
      </div>

      {doc.extraction_error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{doc.extraction_error}</p>}
      {ex.notes && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Agente: {ex.notes}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card h-[75vh] p-0">
          {signed?.signedUrl ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signed.signedUrl} alt={doc.file_name} className="h-full w-full object-contain" />
            ) : (
              <iframe src={signed.signedUrl} className="h-full w-full rounded-xl" title={doc.file_name} />
            )
          ) : (
            <p className="p-5 text-sm text-gray-500">Não foi possível abrir o arquivo.</p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-1 font-semibold">Conferir e criar conta a pagar</h2>
          <p className="mb-4 text-xs text-gray-500">
            Campos preenchidos pelo agente{ex.confidence ? ` (confiança ${ex.confidence})` : ""}. Corrija o que precisar.
          </p>
          <ActionForm action={createPayableAction} submitLabel="Criar conta a pagar" className="grid grid-cols-2 gap-3">
            <input type="hidden" name="document_id" value={doc.id} />
            <input type="hidden" name="client_id" value={client.id} />
            <div className="col-span-2">
              <label className="label">Favorecido</label>
              <input className="input" name="supplier_name" defaultValue={ex.supplier_name ?? ""} required />
            </div>
            <div>
              <label className="label">CNPJ/CPF do favorecido</label>
              <input className="input" name="supplier_document" defaultValue={ex.supplier_document ?? ""} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <input className="input" name="category" defaultValue={ex.suggested_category ?? ""} />
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input
                className="input"
                name="amount"
                defaultValue={ex.amount != null ? ex.amount.toFixed(2).replace(".", ",") : ""}
                required
              />
            </div>
            <div>
              <label className="label">Vencimento</label>
              <input className="input" type="date" name="due_date" defaultValue={ex.due_date ?? ""} required />
            </div>
            <div className="col-span-2">
              <label className="label">Linha digitável</label>
              <input className="input font-mono" name="barcode" defaultValue={ex.barcode ?? ""} />
            </div>
            <div className="col-span-2">
              <label className="label">Chave Pix</label>
              <input className="input" name="pix_key" defaultValue={ex.pix_key ?? ""} />
            </div>
            <div className="col-span-2">
              <label className="label">Descrição</label>
              <input className="input" name="description" defaultValue={ex.description ?? ""} />
            </div>
            <div className="col-span-2">
              <label className="label">Pagar pela conta</label>
              <select className="input" name="bank_account_id" defaultValue="">
                <option value="">Definir no agendamento</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} {a.label ? `(${a.label})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </ActionForm>

          <div className="mt-6 flex gap-3 border-t pt-4">
            <form action={rereadDocumentAction}>
              <input type="hidden" name="document_id" value={doc.id} />
              <button className="btn-secondary">Ler de novo com o agente</button>
            </form>
            <form action={discardDocumentAction}>
              <input type="hidden" name="document_id" value={doc.id} />
              <button className="btn text-gray-600 hover:bg-gray-100">Descartar</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
