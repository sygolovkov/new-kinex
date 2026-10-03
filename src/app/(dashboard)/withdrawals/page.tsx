import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtRub, fmtUsdt } from "@/lib/fmt";
import { formatMskDateTime } from "@/lib/time";
import { toDecimal } from "@/lib/money";
import { getUsdtRate } from "@/lib/usdt";

export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PENDING: "Ожидает",
  COMPLETED: "Выполнено",
} as const;

export default async function WithdrawalsPage() {
  const withdrawals = await prisma.withdrawal.findMany({
    include: { manager: true },
    orderBy: { createdAt: "desc" },
  });

  const needsLiveRate = withdrawals.some((w) => w.usdtAmount === null);
  const liveRate = needsLiveRate ? await getUsdtRate() : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">Выводы</h1>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-normal">Менеджер</th>
              <th className="px-4 py-2 font-normal">Сумма RUB</th>
              <th className="px-4 py-2 font-normal">Сумма USDT</th>
              <th className="px-4 py-2 font-normal">Статус</th>
              <th className="px-4 py-2 font-normal">USDT кошелёк</th>
              <th className="px-4 py-2 font-normal">Создан</th>
              <th className="px-4 py-2 font-normal">Обновлён</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => {
              let usdtDisplay: string;
              if (w.usdtAmount !== null) {
                usdtDisplay = `${fmtUsdt(w.usdtAmount)} USDT`;
              } else if (liveRate && liveRate.greaterThan(0)) {
                const live = toDecimal(w.amount).div(liveRate).toDecimalPlaces(2);
                usdtDisplay = `~${fmtUsdt(live)} USDT`;
              } else {
                usdtDisplay = "—";
              }

              return (
                <tr key={w.id} className="border-t border-neutral-800 bg-neutral-950">
                  <td className="px-4 py-2 text-neutral-200">
                    {w.manager.name || w.manager.telegramUsername || w.manager.telegramId}
                  </td>
                  <td className="px-4 py-2 text-neutral-300">{fmtRub(w.amount)}</td>
                  <td className="px-4 py-2 text-neutral-400">{usdtDisplay}</td>
                  <td className="px-4 py-2 text-neutral-300">{STATUS_LABEL[w.status]}</td>
                  <td className="px-4 py-2 text-neutral-400">{w.manager.usdtWallet || "—"}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatMskDateTime(w.createdAt)}</td>
                  <td className="px-4 py-2 text-neutral-500">{formatMskDateTime(w.updatedAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/withdrawals/${w.id}`} className="text-indigo-400 hover:underline">
                      Изменить
                    </Link>
                  </td>
                </tr>
              );
            })}
            {withdrawals.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  Заявок на вывод пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
