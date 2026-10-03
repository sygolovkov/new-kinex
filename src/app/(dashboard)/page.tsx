import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { fmtRub, fmtUsdt } from "@/lib/fmt";
import { formatMskDateTime } from "@/lib/time";
import { PAYMENT_STATUS_EMOJI, PAYMENT_STATUS_LABEL } from "@/lib/payments/status";

export const dynamic = "force-dynamic";

function DynBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span className={positive ? "text-emerald-400" : "text-red-400"}>
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

function Tile({
  title,
  value,
  sub,
  dyn,
}: {
  title: string;
  value: string;
  sub?: string;
  dyn?: number | null;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
        {sub}
        {dyn !== undefined && <DynBadge value={dyn} />}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const s = await getDashboardStats();
  const maxHourly = Math.max(1, ...s.hourlyData);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-100">Дашборд</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          title="Менеджеры"
          value={String(s.managers.total)}
          sub={`активных: ${s.managers.active} · неактивных: ${s.managers.inactive}`}
        />
        <Tile
          title="Платежей сегодня"
          value={String(s.payToday.count)}
          sub={`${fmtRub(s.payToday.sum)} RUB`}
          dyn={s.dynPayCount}
        />
        <Tile
          title="Платежей за месяц"
          value={String(s.payMonth.count)}
          sub={`${fmtRub(s.payMonth.sum)} RUB`}
        />
        <Tile
          title="Требует внимания"
          value={String(s.pendingTotal)}
          sub={`выводы: ${s.pendingWithdrawal} · профиль: ${s.pendingProfile}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tile
          title="Прибыль сегодня"
          value={`${fmtRub(s.profitToday)} RUB`}
          sub={`≈ ${fmtUsdt(s.profitTodayUsdt)} USDT`}
          dyn={s.dynToday}
        />
        <Tile
          title="Прибыль за неделю"
          value={`${fmtRub(s.profitWeek)} RUB`}
          sub={`≈ ${fmtUsdt(s.profitWeekUsdt)} USDT`}
          dyn={s.dynWeek}
        />
        <Tile
          title="Прибыль за месяц"
          value={`${fmtRub(s.profitMonth)} RUB`}
          sub={`≈ ${fmtUsdt(s.profitMonthUsdt)} USDT`}
          dyn={s.dynMonth}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile title="Курс USDT" value={`${fmtRub(s.usdtRate)} RUB`} />
        <Tile
          title="Транзакций сегодня"
          value={String(s.allTodayCount)}
          dyn={s.dynAllCount}
        />
        <Tile title="В процессе" value={String(s.activeCount)} dyn={s.dynActive} />
        <Tile
          title="Общий баланс (успешные)"
          value={`${fmtRub(s.totalGross)} RUB`}
          sub={`≈ ${fmtUsdt(s.totalGrossUsdt)} USDT`}
        />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-4 text-sm font-semibold text-neutral-200">
          Динамика платежей по часам (сегодня)
        </div>
        <div className="flex h-40 items-end gap-1">
          {s.hourlyData.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-indigo-500/70"
                style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? 2 : 0 }}
                title={`${s.hourlyLabels[i]}: ${count}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-neutral-600">
          <span>00:00</span>
          <span>12:00</span>
          <span>23:00</span>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-neutral-200">
            Доступно к выводу (накопления)
          </span>
          <span className="text-neutral-400">
            {fmtRub(s.availableTotal)} / {fmtRub(s.withdrawalLimit)} RUB (
            {s.limitProgress}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${s.limitProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-3 text-sm font-semibold text-neutral-200">
            Заявки на вывод ({s.pendingWithdrawalsList.length})
          </div>
          {s.pendingWithdrawalsList.length === 0 ? (
            <p className="text-sm text-neutral-500">Нет необработанных заявок.</p>
          ) : (
            <ul className="space-y-2">
              {s.pendingWithdrawalsList.map((w) => (
                <li key={w.id} className="flex justify-between text-sm">
                  <span className="text-neutral-300">
                    {w.manager.name || w.manager.telegramUsername || w.manager.telegramId}
                  </span>
                  <Link href="/withdrawals" className="text-indigo-400 hover:underline">
                    {fmtRub(w.amount)} RUB
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-3 text-sm font-semibold text-neutral-200">
            Заявки на изменение профиля ({s.pendingProfileList.length})
          </div>
          {s.pendingProfileList.length === 0 ? (
            <p className="text-sm text-neutral-500">Нет необработанных заявок.</p>
          ) : (
            <ul className="space-y-2">
              {s.pendingProfileList.map((r) => (
                <li key={r.id} className="flex justify-between text-sm">
                  <span className="text-neutral-300">
                    {r.manager.name || r.manager.telegramUsername || r.manager.telegramId}
                  </span>
                  <Link href="/profile-requests" className="text-indigo-400 hover:underline">
                    {r.field === "email" ? "Email" : "USDT кошелёк"}: {r.newValue}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-3 text-sm font-semibold text-neutral-200">
          Последние платежи
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-neutral-500">
              <th className="pb-2 font-normal">Менеджер</th>
              <th className="pb-2 font-normal">Сумма</th>
              <th className="pb-2 font-normal">Статус</th>
              <th className="pb-2 font-normal">Дата</th>
            </tr>
          </thead>
          <tbody>
            {s.recentPayments.map((p) => (
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="py-2 text-neutral-300">
                  {p.manager?.name || p.manager?.telegramUsername || "—"}
                </td>
                <td className="py-2 text-neutral-300">
                  {fmtRub(p.amount)} {p.currency}
                </td>
                <td className="py-2 text-neutral-300">
                  {PAYMENT_STATUS_EMOJI[p.status]} {PAYMENT_STATUS_LABEL[p.status]}
                </td>
                <td className="py-2 text-neutral-500">{formatMskDateTime(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
