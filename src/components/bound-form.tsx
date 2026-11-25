"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";

export function BoundForm({
  action,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {state.error ? (
        <p className="form-error mb-4" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="form-ok mb-4">{state.ok}</p> : null}
      {children}
    </form>
  );
}
