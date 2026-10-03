"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  username: z.string().trim().min(1, "Введите логин"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Заполните логин и пароль." };
  }

  const { username, password } = parsed.data;
  const admin = await prisma.adminUser.findUnique({ where: { username } });

  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { error: "Неверный логин или пароль." };
  }

  await createSession({ adminId: admin.id, username: admin.username });
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
