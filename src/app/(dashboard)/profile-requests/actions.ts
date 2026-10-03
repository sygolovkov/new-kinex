"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ProfileChangeStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const ProfileRequestSchema = z.object({
  status: z.enum(ProfileChangeStatus),
});

export type ProfileRequestFormState = { error?: string } | undefined;

export async function updateProfileRequest(
  id: string,
  _prevState: ProfileRequestFormState,
  formData: FormData
): Promise<ProfileRequestFormState> {
  const parsed = ProfileRequestSchema.safeParse({ status: formData.get("status") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте форму." };
  }

  // Намеренно НЕ применяем новое значение к Manager автоматически — это ручной
  // процесс в оригинале: админ сам идёт в карточку менеджера и меняет поле.
  await prisma.profileChangeRequest.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/profile-requests");
  redirect("/profile-requests");
}
