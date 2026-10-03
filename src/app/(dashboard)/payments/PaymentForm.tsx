"use client";

import { useActionState } from "react";
import type { Payment, Manager } from "@/generated/prisma/client";
import { PAYMENT_STATUS_LABEL } from "@/lib/payments/status";
import type { PaymentStatus } from "@/generated/prisma/enums";
import type { PaymentFormState } from "./actions";

type Action = (
  state: PaymentFormState,
  formData: FormData
) => Promise<PaymentFormState>;

const STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[];

export function PaymentForm({
  payment,
  managers,
  action,
}: {
  payment: Payment;
  managers: Manager[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Менеджер">
        <select name="managerId" defaultValue={payment.managerId ?? ""} className="input">
          <option value="">—</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || m.telegramUsername || m.telegramId}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Сумма">
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={payment.amount.toString()}
          className="input"
        />
      </Field>
      <Field label="Валюта">
        <input name="currency" defaultValue={payment.currency} className="input" />
      </Field>
      <Field label="Order ID">
        <input name="orderId" defaultValue={payment.orderId} className="input" />
      </Field>
      <Field label="Описание">
        <textarea name="description" defaultValue={payment.description} className="input" rows={3} />
      </Field>
      <Field label="Transaction ID">
        <input name="transactionId" defaultValue={payment.transactionId} className="input" />
      </Field>
      <Field label="Статус">
        <select name="status" defaultValue={payment.status} className="input">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          name="isSettled"
          defaultChecked={payment.isSettled}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-800"
        />
        Зачтён
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
