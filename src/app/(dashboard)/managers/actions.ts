"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ManagerSchema = z
  .object({
    telegramId: z.string().trim(),
    telegramUsername: z.string().trim(),
    name: z.string().trim(),
    email: z.string().trim(),
    usdtWallet: z.string().trim(),
    commission: z.coerce.number().min(0).max(100),
    isActive: z.boolean(),
  })
  .refine((data) => data.telegramId || data.telegramUsername, {
    message: "Укажите Telegram ID или username.",
    path: ["telegramId"],
  });

export type ManagerFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return ManagerSchema.safeParse({
    telegramId: formData.get("telegramId"),
    telegramUsername: formData.get("telegramUsername"),
    name: formData.get("name"),
    email: formData.get("email"),
    usdtWallet: formData.get("usdtWallet"),
    commission: formData.get("commission"),
    isActive: formData.get("isActive") === "on",
  });
}

/** Аналог Django `clean()` — уникальность проверяется на уровне приложения, не в БД. */
async function checkUniqueness(
  data: { telegramId: string; telegramUsername: string },
  excludeId?: string
): Promise<string | null> {
  if (data.telegramId) {
    const clash = await prisma.manager.findFirst({
      where: { telegramId: data.telegramId, id: { not: excludeId } },
    });
    if (clash) return "Менеджер с таким Telegram ID уже существует.";
  }
  if (data.telegramUsername) {
    const clash = await prisma.manager.findFirst({
      where: { telegramUsername: data.telegramUsername, id: { not: excludeId } },
    });
    if (clash) return "Менеджер с таким username уже существует.";
  }
  return null;
}

export async function createManager(
  _prevState: ManagerFormState,
  formData: FormData
): Promise<ManagerFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте форму." };
  }

  const uniquenessError = await checkUniqueness(parsed.data);
  if (uniquenessError) return { error: uniquenessError };

  await prisma.manager.create({ data: parsed.data });
  revalidatePath("/managers");
  redirect("/managers");
}

export async function updateManager(
  id: string,
  _prevState: ManagerFormState,
  formData: FormData
): Promise<ManagerFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте форму." };
  }

  const uniquenessError = await checkUniqueness(parsed.data, id);
  if (uniquenessError) return { error: uniquenessError };

  await prisma.manager.update({ where: { id }, data: parsed.data });
  revalidatePath("/managers");
  redirect("/managers");
}

export async function deleteManager(id: string) {
  // FK-ограничение (Payment/Withdrawal ссылаются на Manager с onDelete: Restrict) —
  // аналог Django PROTECT: у менеджера есть платежи/выводы, удаление запрещено.
  const blocked = await prisma.manager
    .delete({ where: { id } })
    .then(() => false)
    .catch(() => true);

  revalidatePath("/managers");
  redirect(blocked ? "/managers?error=has_relations" : "/managers");
}
