"use client";

import { useActionState, type ReactNode } from "react";

type State = { error?: string; ok?: string };

/** Formulário ligado a uma server action, com mensagem de erro ou sucesso. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "space-y-3",
}: {
  action: (prev: State, form: FormData) => Promise<State>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-logos-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
