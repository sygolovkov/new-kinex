import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtRub } from "@/lib/fmt";
import { formatMskDateTime } from "@/lib/time";
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABEL } from "@/lib/payments/status";
import type { PaymentStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[];

export default async function PaymentsPage({
  searchParams,
}: PageProps<"/payments">) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const status =
    statusParam && STATUS_OPTIONS.includes(statusParam as PaymentStatus)
      ? (statusParam as PaymentStatus)
      : undefined;

  const payments = await prisma.payment.findMany({
    where: status ? { status } : undefined,
    include: { manager: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-100">Платежи</h1>
      </div>

      <form className="flex items-center gap-2 text-sm">
        <label className="text-neutral-400" htmlFor="status">
          Статус:
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className="input w-auto">
          <option value="">Все</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 transition hover:bg-neutral-800"
        >
          Применить
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-normal">Менеджер</th>
              <th className="px-4 py-2 font-normal">Сумма</th>
              <th className="px-4 py-2 font-normal">Валюта</th>
              <th className="px-4 py-2 font-normal">Статус</th>
              <th className="px-4 py-2 font-normal">Зачтён</th>
              <th className="px-4 py-2 font-normal">Order ID</th>
              <th className="px-4 py-2 font-normal">Transaction ID</th>
              <th className="px-4 py-2 font-normal">Дата</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800 bg-neutral-950">
                <td className="px-4 py-2 text-neutral-200">
                  {p.manager?.name || p.manager?.telegramUsername || p.manager?.telegramId || "—"}
                </td>
                <td className="px-4 py-2 text-neutral-300">{fmtRub(p.amount)}</td>
                <td className="px-4 py-2 text-neutral-400">{p.currency}</td>
                <td className="px-4 py-2 text-neutral-300">
                  {PAYMENT_STATUS_EMOJI[p.status]} {PAYMENT_STATUS_LABEL[p.status]}
                </td>
                <td className="px-4 py-2">
                  {p.isSettled ? (
                    <span className="text-emerald-400">да</span>
                  ) : (
                    <span className="text-neutral-500">нет</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-400">{p.orderId}</td>
                <td className="px-4 py-2 text-neutral-400">{p.transactionId || "—"}</td>
                <td className="px-4 py-2 text-neutral-500">{formatMskDateTime(p.createdAt)}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/payments/${p.id}`} className="text-indigo-400 hover:underline">
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-neutral-500">
                  Платежей пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
