"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsFormState } from "./actions";

export function SettingsForm({
  settings,
}: {
  settings: {
    adminTelegramUsername: string;
    botToken: string;
    paymentSystemCommission: string;
    withdrawalLimit: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <Field label="Telegram username администратора">
        <input
          name="adminTelegramUsername"
          defaultValue={settings.adminTelegramUsername}
          className="input"
        />
      </Field>
      <Field label="Bot Token (опционально, иначе используется BOT_TOKEN из env)">
        <input name="botToken" defaultValue={settings.botToken} className="input" />
      </Field>
      <Field label="Комиссия платёжной системы (%)">
        <input
          name="paymentSystemCommission"
          type="number"
          step="0.01"
          min="0"
          max="100"
          defaultValue={settings.paymentSystemCommission}
          className="input"
        />
      </Field>
      <Field label="Лимит накоплений (RUB)">
        <input
          name="withdrawalLimit"
          type="number"
          step="0.01"
          min="0"
          defaultValue={settings.withdrawalLimit}
          className="input"
        />
      </Field>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-400">Настройки сохранены.</p>}

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
