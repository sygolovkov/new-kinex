import { Bot, session } from "grammy";
import { getBotToken } from "@/lib/settings";
import { managerAccessMiddleware } from "@/lib/bot/access";
import { botComposer } from "@/lib/bot/handlers";
import { initialSession, prismaSessionStorage } from "@/lib/bot/session";
import type { MyContext } from "@/lib/bot/types";

export async function createBot(): Promise<Bot<MyContext>> {
  const token = await getBotToken();
  const bot = new Bot<MyContext>(token);

  bot.use(
    session({
      initial: initialSession,
      storage: prismaSessionStorage,
      getSessionKey: (ctx) => ctx.chat?.id.toString(),
    })
  );
  bot.use(managerAccessMiddleware);
  bot.use(botComposer);

  return bot;
}
