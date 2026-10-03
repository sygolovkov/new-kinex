"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { PaymentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const PaymentSchema = z.object({
  managerId: z.string().trim(),
  amount: z.coerce.number().min(0),
  currency: z.string().trim().min(1, "Укажите валюту."),
  orderId: z.string().trim().min(1, "Укажите order ID."),
  description: z.string().trim(),
  transactionId: z.string().trim(),
  status: z.enum(PaymentStatus),
  isSettled: z.boolean(),
});

export type PaymentFormState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return PaymentSchema.safeParse({
    managerId: formData.get("managerId"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    orderId: formData.get("orderId"),
    description: formData.get("description"),
    transactionId: formData.get("transactionId"),
    status: formData.get("status"),
    isSettled: formData.get("isSettled") === "on",
  });
}

export async function updatePayment(
  id: string,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте форму." };
  }

  const { managerId, ...rest } = parsed.data;

  const updated = await prisma.payment
    .update({
      where: { id },
      data: { ...rest, managerId: managerId || null },
    })
    .then(() => true)
    .catch((err: unknown) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return false;
      }
      throw err;
    });

  if (!updated) {
    return { error: "Платёж с таким Order ID уже существует." };
  }

  revalidatePath("/payments");
  redirect("/payments");
}
