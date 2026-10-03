import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function ensureAdminUser(username: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
}
