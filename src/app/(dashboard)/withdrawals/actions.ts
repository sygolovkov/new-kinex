"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { WithdrawalStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, toDecimal } from "@/lib/money";
import { getUsdtRate } from "@/lib/usdt";

const WithdrawalSchema = z.object({
  status: z.enum(WithdrawalStatus),
});

export type WithdrawalFormState = { error?: string } | undefined;

export async function updateWithdrawal(
  id: string,
  _prevState: WithdrawalFormState,
  formData: FormData
): Promise<WithdrawalFormState> {
  const parsed = WithdrawalSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте форму." };
  }

  const existing = await prisma.withdrawal.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Заявка не найдена." };
  }

  const data: {
    status: (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];
    usdtRate?: Prisma.Decimal;
    usdtAmount?: Prisma.Decimal;
  } = { status: parsed.data.status };

  // Аналог Django save_model: пересчитываем курс и сумму USDT только один раз —
  // при первом переводе заявки в COMPLETED, если ранее usdtAmount ещё не был посчитан.
  if (parsed.data.status === "COMPLETED" && existing.usdtAmount === null) {
    const rate = await getUsdtRate();
    if (rate.greaterThan(0)) {
      data.usdtRate = rate.toDecimalPlaces(4);
      data.usdtAmount = round2(toDecimal(existing.amount).div(rate));
    }
  }

  await prisma.withdrawal.update({ where: { id }, data });

  revalidatePath("/withdrawals");
  redirect("/withdrawals");
}
