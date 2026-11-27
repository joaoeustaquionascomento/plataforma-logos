import { ActionForm } from "@/components/action-form";
import { requireClientUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { dateBR, sourceLabel } from "@/lib/format";
import { uploadDocumentsAction } from "../actions";

export default async function UploadPage() {
  const profile = await requireClientUser();
  const supabase = await createClient();
  const [{ data: client }, { data: recent }] = await Promise.all([
    supabase.from("clients").select("inbox_slug").eq("id", profile.client_id).single(),
    supabase
      .from("documents")
      .select("id, file_name, source, created_at")
      .eq("client_id", profile.client_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card">
        <h1 className="mb-1 text-xl font-bold">Enviar documento</h1>
        <p className="mb-4 text-sm text-gray-500">Boletos, notas fiscais e recibos, em PDF ou foto.</p>
        <ActionForm action={uploadDocumentsAction} submitLabel="Enviar">
          <input
            className="input"
            type="file"
            name="files"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            capture="environment"
            required
          />
          <div>
            <label className="label">Observação (opcional)</label>
            <input className="input" name="note" placeholder="Ex.: pagar só depois do dia 10" />
          </div>
        </ActionForm>
        {client && (
          <p className="mt-6 text-sm text-gray-600">
            Também pode encaminhar por e-mail para <strong>{client.inbox_slug}@{env.inboxDomain()}</strong>.
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Enviados recentemente</h2>
        <ul className="divide-y text-sm">
          {recent?.map((d) => (
            <li key={d.id} className="py-2">
              {dateBR(d.created_at)} · {d.file_name} <span className="text-gray-500">({sourceLabel[d.source]})</span>
            </li>
          ))}
          {!recent?.length && <li className="text-gray-500">Nenhum documento enviado ainda.</li>}
        </ul>
      </section>
    </div>
  );
}
