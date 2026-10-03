import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ManagerForm } from "../ManagerForm";
import { updateManager, deleteManager } from "../actions";

export default async function EditManagerPage({
  params,
}: PageProps<"/managers/[id]">) {
  const { id } = await params;
  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) notFound();

  const boundUpdate = updateManager.bind(null, id);
  const boundDelete = deleteManager.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">
        Менеджер: {manager.name || manager.telegramUsername || manager.telegramId}
      </h1>
      <ManagerForm manager={manager} action={boundUpdate} />

      <form action={boundDelete} className="pt-4">
        <button
          type="submit"
          className="rounded-md border border-red-900 px-4 py-2 text-sm text-red-400 transition hover:bg-red-950"
        >
          Удалить менеджера
        </button>
      </form>
    </div>
  );
}
