import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMskDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const FIELD_LABEL = {
  email: "Email",
  usdt_wallet: "USDT кошелёк",
} as const;

const STATUS_LABEL = {
  PENDING: "Ожидает",
  COMPLETED: "Выполнено",
} as const;

export default async function ProfileRequestsPage() {
  const requests = await prisma.profileChangeRequest.findMany({
    include: { manager: true },
    // Как в оригинале: сначала PENDING, потом COMPLETED; внутри группы — новые сверху.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">Заявки на изменение профиля</h1>

      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-normal">Менеджер</th>
              <th className="px-4 py-2 font-normal">Поле</th>
              <th className="px-4 py-2 font-normal">Новое значение</th>
              <th className="px-4 py-2 font-normal">Статус</th>
              <th className="px-4 py-2 font-normal">Создана</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-neutral-800 bg-neutral-950">
                <td className="px-4 py-2 text-neutral-200">
                  {r.manager.name || r.manager.telegramUsername || r.manager.telegramId}
                </td>
                <td className="px-4 py-2 text-neutral-400">{FIELD_LABEL[r.field]}</td>
                <td className="px-4 py-2 text-neutral-300">{r.newValue}</td>
                <td className="px-4 py-2 text-neutral-300">{STATUS_LABEL[r.status]}</td>
                <td className="px-4 py-2 text-neutral-500">{formatMskDateTime(r.createdAt)}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/profile-requests/${r.id}`} className="text-indigo-400 hover:underline">
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                  Заявок пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
