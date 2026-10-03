import { prisma } from "@/lib/prisma";

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export async function getBotToken(): Promise<string> {
  const settings = await getSettings();
  if (settings.botToken) return settings.botToken;
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN is not set");
  return token;
}
