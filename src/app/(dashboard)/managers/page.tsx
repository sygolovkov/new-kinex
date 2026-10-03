import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManagersPage({
  searchParams,
}: PageProps<"/managers">) {
  const params = await searchParams;
  const managers = await prisma.manager.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-100">Менеджеры</h1>
        <Link
          href="/managers/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Добавить менеджера
        </Link>
      </div>

      {params.error === "has_relations" && (
        <p className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-300">
          Нельзя удалить менеджера — у него есть связанные платежи или заявки на вывод.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-normal">Имя</th>
              <th className="px-4 py-2 font-normal">Telegram ID</th>
              <th className="px-4 py-2 font-normal">Username</th>
              <th className="px-4 py-2 font-normal">Email</th>
              <th className="px-4 py-2 font-normal">USDT кошелёк</th>
              <th className="px-4 py-2 font-normal">Комиссия</th>
              <th className="px-4 py-2 font-normal">Активен</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {managers.map((m) => (
              <tr key={m.id} className="border-t border-neutral-800 bg-neutral-950">
                <td className="px-4 py-2 text-neutral-200">{m.name || "—"}</td>
                <td className="px-4 py-2 text-neutral-400">{m.telegramId || "—"}</td>
                <td className="px-4 py-2 text-neutral-400">{m.telegramUsername || "—"}</td>
                <td className="px-4 py-2 text-neutral-400">{m.email || "—"}</td>
                <td className="px-4 py-2 text-neutral-400">{m.usdtWallet || "—"}</td>
                <td className="px-4 py-2 text-neutral-400">{m.commission.toString()}%</td>
                <td className="px-4 py-2">
                  {m.isActive ? (
                    <span className="text-emerald-400">да</span>
                  ) : (
                    <span className="text-neutral-500">нет</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/managers/${m.id}`} className="text-indigo-400 hover:underline">
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
            {managers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  Менеджеров пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
