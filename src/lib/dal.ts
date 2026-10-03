import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.adminId) {
    redirect("/login");
  }
  return session;
});

export const getCurrentAdmin = cache(async () => {
  const session = await getSession();
  if (!session?.adminId) return null;
  return prisma.adminUser.findUnique({ where: { id: session.adminId } });
});
