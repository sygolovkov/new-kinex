import Link from "next/link";
import { getCurrentAdmin, verifySession } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/", label: "Дашборд" },
  { href: "/managers", label: "Менеджеры" },
  { href: "/payments", label: "Платежи" },
  { href: "/withdrawals", label: "Выводы" },
  { href: "/profile-requests", label: "Заявки на профиль" },
  { href: "/settings", label: "Настройки" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await verifySession();
  const admin = await getCurrentAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-6 px-2 text-lg font-semibold text-neutral-100">
          Kinex
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/60 px-6 py-3">
          <span className="text-sm text-neutral-400">
            {admin ? `Администратор: ${admin.username}` : null}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800"
            >
              Выйти
            </button>
          </form>
        </header>
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  );
}
