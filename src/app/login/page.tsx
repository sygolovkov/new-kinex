"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-xl font-semibold text-neutral-100">
          Kinex · Вход в панель
        </h1>

        <div className="space-y-1">
          <label htmlFor="username" className="text-sm text-neutral-400">
            Логин
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-neutral-400">
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-indigo-600 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
