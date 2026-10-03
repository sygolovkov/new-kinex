"use client";

import { useActionState } from "react";
import type { ProfileChangeRequest, Manager } from "@/generated/prisma/client";
import { formatMskDateTime } from "@/lib/time";
import type { ProfileRequestFormState } from "./actions";

type Action = (
  state: ProfileRequestFormState,
  formData: FormData
) => Promise<ProfileRequestFormState>;

const FIELD_LABEL = {
  email: "Email",
  usdt_wallet: "USDT кошелёк",
} as const;

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Ожидает" },
  { value: "COMPLETED", label: "Выполнено" },
] as const;

export function ProfileRequestForm({
  request,
  manager,
  action,
}: {
  request: ProfileChangeRequest;
  manager: Manager;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <ReadonlyField label="Менеджер">
        {manager.name || manager.telegramUsername || manager.telegramId}
      </ReadonlyField>
      <ReadonlyField label="Поле">{FIELD_LABEL[request.field]}</ReadonlyField>
      <ReadonlyField label="Новое значение">{request.newValue}</ReadonlyField>
      <ReadonlyField label="Создана">{formatMskDateTime(request.createdAt)}</ReadonlyField>

      <div className="space-y-1">
        <label className="block text-sm text-neutral-400">Статус</label>
        <select name="status" defaultValue={request.status} className="input">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-neutral-500">
        Отметка «Выполнено» не применяет значение автоматически — изменение нужно внести
        вручную в карточке менеджера.
      </p>

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
