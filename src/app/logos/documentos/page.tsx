import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dateBR, documentStatusLabel, sourceLabel } from "@/lib/format";
import { StatusBadge, documentTone } from "@/components/status-badge";

const filters = [
  { key: "abertos", label: "Para conferir", statuses: ["received", "extracting", "extracted", "needs_review"] },
  { key: "processados", label: "Processados", statuses: ["processed"] },
  { key: "descartados", label: "Descartados", statuses: ["discarded"] },
];

export default async function DocumentsPage({ searchParams }: PageProps<"/logos/documentos">) {
  const { f } = await searchParams;
  const filter = filters.find((x) => x.key === f) ?? filters[0];
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_name, source, status, created_at, extracted, clients(name)")
    .in("status", filter.statuses)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <div className="flex gap-2 text-sm">
          {filters.map((x) => (
            <Link
              key={x.key}
              href={`/logos/documentos?f=${x.key}`}
              className={`rounded-full px-3 py-1 ${x.key === filter.key ? "bg-navy-950 text-white" : "bg-gray-100"}`}
            >
              {x.label}
            </Link>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="py-1">Recebido</th>
            <th>Cliente</th>
            <th>Arquivo</th>
            <th>Origem</th>
            <th>Favorecido lido</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {docs?.map((d) => {
            const ex = d.extracted as { supplier_name?: string | null } | null;
            return (
              <tr key={d.id}>
                <td className="py-2">{dateBR(d.created_at)}</td>
                <td>{(d.clients as unknown as { name: string } | null)?.name}</td>
                <td>
                  <Link className="text-logos-700 hover:underline" href={`/logos/documentos/${d.id}`}>
                    {d.file_name}
                  </Link>
                </td>
                <td>{sourceLabel[d.source]}</td>
                <td>{ex?.supplier_name ?? "-"}</td>
                <td>
                  <StatusBadge label={documentStatusLabel[d.status]} tone={documentTone(d.status)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!docs?.length && <p className="mt-3 text-sm text-gray-500">Nenhum documento aqui.</p>}
    </div>
  );
}
