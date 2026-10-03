import type { StorageAdapter } from "grammy";
import { prisma } from "@/lib/prisma";

export type BotState =
  | "link_description"
  | "link_amount"
  | "link_confirm"
  | "profile_value"
  | null;

export interface SessionData {
  state: BotState;
  description?: string;
  amount?: number;
  profileField?: "email" | "usdt_wallet";
}

export function initialSession(): SessionData {
  return { state: null };
}

/**
 * Хранилище сессий grammY поверх таблицы BotDialogState — замена
 * aiogram FSMContext, который в оригинале жил только в памяти процесса бота.
 * Ключ — chatId (строка), это то же самое, что в aiogram "storage key".
 */
export const prismaSessionStorage: StorageAdapter<SessionData> = {
  async read(key) {
    const row = await prisma.botDialogState.findUnique({
      where: { chatId: key },
    });
    if (!row) return undefined;
    return row.data as unknown as SessionData;
  },
  async write(key, value) {
    const data = JSON.parse(JSON.stringify(value));
    await prisma.botDialogState.upsert({
      where: { chatId: key },
      create: { chatId: key, state: value.state, data },
      update: { state: value.state, data },
    });
  },
  async delete(key) {
    await prisma.botDialogState.deleteMany({ where: { chatId: key } });
  },
};
