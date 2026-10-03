"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SettingsSchema = z.object({
  adminTelegramUsername: z.string().trim(),
  botToken: z.string().trim(),
  paymentSystemCommission: z.coerce.number().min(0).max(100),
  withdrawalLimit: z.coerce.number().min(0),
});

export type SettingsFormState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const parsed = SettingsSchema.safeParse({
    adminTelegramUsername: formData.get("adminTelegramUsername"),
    botToken: formData.get("botToken"),
    paymentSystemCommission: formData.get("paymentSystemCommission"),
    withdrawalLimit: formData.get("withdrawalLimit"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте форму." };
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });

  revalidatePath("/settings");
  return { success: true };
}
