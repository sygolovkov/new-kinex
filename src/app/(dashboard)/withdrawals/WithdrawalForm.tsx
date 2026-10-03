"use client";

import { useActionState } from "react";
import type { WithdrawalFormState } from "./actions";

type Action = (
  state: WithdrawalFormState,
  formData: FormData
) => Promise<WithdrawalFormState>;

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Ожидает" },
  { value: "COMPLETED", label: "Выполнено" },
] as const;

export function WithdrawalForm({
  managerLabel,
  amountDisplay,
  usdtAmountDisplay,
  usdtRateDisplay,
  status,
  action,
}: {
  managerLabel: string;
  amountDisplay: string;
  usdtAmountDisplay: string;
  usdtRateDisplay: string;
  status: string;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <ReadonlyField label="Менеджер">{managerLabel}</ReadonlyField>
      <ReadonlyField label="Сумма">{amountDisplay}</ReadonlyField>
      <ReadonlyField label="Сумма USDT">{usdtAmountDisplay}</ReadonlyField>
      <ReadonlyField label="Курс USDT">{usdtRateDisplay}</ReadonlyField>

      <div className="space-y-1">
        <label className="block text-sm text-neutral-400">Статус</label>
        <select name="status" defaultValue={status} className="input">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

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

function ReadonlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-neutral-400">{label}</label>
      <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-300">
        {children}
      </div>
    </div>
  );
}
