import { ActionForm } from "@/components/action-form";
import { requireClientUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateBR } from "@/lib/format";
import { answerQuestionAction } from "../actions";

export default async function QuestionsPage() {
  const profile = await requireClientUser();
  const supabase = await createClient();
  const { data: questions } = await supabase
    .from("client_questions")
    .select("id, question, answer, created_at, answered_at")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false })
    .limit(50);

  const open = questions?.filter((q) => !q.answered_at) ?? [];
  const done = questions?.filter((q) => q.answered_at) ?? [];

  return (
    <div className="space-y-6">
      <section className="card">
        <h1 className="mb-4 text-xl font-bold">Perguntas da Logos</h1>
        {open.map((q) => (
          <div key={q.id} className="mb-4 border-b pb-4">
            <p className="text-sm text-gray-500">{dateBR(q.created_at)}</p>
            <p className="mb-2">{q.question}</p>
            <ActionForm action={answerQuestionAction} submitLabel="Responder" className="flex gap-2">
              <input type="hidden" name="question_id" value={q.id} />
              <input className="input" name="answer" required />
            </ActionForm>
          </div>
        ))}
        {!open.length && <p className="text-sm text-gray-500">Nenhuma pergunta em aberto.</p>}
      </section>
      {done.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Respondidas</h2>
          <ul className="space-y-2 text-sm">
            {done.map((q) => (
              <li key={q.id}>
                <p className="text-gray-600">{q.question}</p>
                <p>{q.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
