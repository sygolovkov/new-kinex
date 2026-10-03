import type { NextFunction } from "grammy";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import type { MyContext } from "@/lib/bot/types";
import type { Manager } from "@/generated/prisma/client";

async function findOrLinkManager(
  telegramId: number,
  username: string | undefined
): Promise<Manager | null> {
  const idStr = String(telegramId);
  const manager = await prisma.manager.findFirst({
    where: {
      isActive: true,
      OR: [
        { telegramId: idStr },
        ...(username ? [{ telegramUsername: username }] : []),
      ],
    },
  });
  if (!manager) return null;

  const update: { telegramId?: string; telegramUsername?: string } = {};
  if (!manager.telegramId) update.telegramId = idStr;
  if (username && !manager.telegramUsername) update.telegramUsername = username;

  if (Object.keys(update).length > 0) {
    return prisma.manager.update({ where: { id: manager.id }, data: update });
  }
  return manager;
}

async function accessDeniedText(): Promise<string> {
  const settings = await getSettings();
  let text =
    "Доступ закрыт. Этот сервис доступен только авторизованным операторам. " +
    "Для подключения свяжитесь с Администратором.";
  if (settings.adminTelegramUsername) {
    text += `\n\n👤 @${settings.adminTelegramUsername.replace(/^@/, "")}`;
  }
  return text;
}

/** Аналог aiogram ManagerAccessMiddleware — применяется ко всем входящим апдейтам. */
export async function managerAccessMiddleware(
  ctx: MyContext,
  next: NextFunction
) {
  const from = ctx.from;
  if (!from) return;

  const manager = await findOrLinkManager(from.id, from.username);
  if (!manager) {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: "Доступ закрыт. Свяжитесь с Администратором.",
        show_alert: true,
      });
    } else {
      await ctx.reply(await accessDeniedText());
    }
    return;
  }

  ctx.manager = manager;
  await next();
}
