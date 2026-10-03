"use client";

import { useActionState } from "react";
import type { Manager } from "@/generated/prisma/client";
import type { ManagerFormState } from "./actions";

type Action = (
  state: ManagerFormState,
  formData: FormData
) => Promise<ManagerFormState>;

export function ManagerForm({
  manager,
  action,
}: {
  manager?: Manager;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Telegram ID">
        <input
          name="telegramId"
          defaultValue={manager?.telegramId}
          className="input"
        />
      </Field>
      <Field label="Telegram username">
        <input
          name="telegramUsername"
          defaultValue={manager?.telegramUsername}
          className="input"
        />
      </Field>
      <Field label="Имя">
        <input name="name" defaultValue={manager?.name} className="input" />
      </Field>
      <Field label="Email">
        <input name="email" type="email" defaultValue={manager?.email} className="input" />
      </Field>
      <Field label="USDT кошелёк">
        <input name="usdtWallet" defaultValue={manager?.usdtWallet} className="input" />
      </Field>
      <Field label="Комиссия (%)">
        <input
          name="commission"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={manager?.commission.toString() ?? "5.00"}
          className="input"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={manager?.isActive ?? true}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-800"
        />
        Активен
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-neutral-400">{label}</label>
      {children}
    </div>
  );
}
