import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot/bot";

export async function POST(request: Request) {
  const bot = await createBot();
  const handleUpdate = webhookCallback(bot, "std/http", {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
  return handleUpdate(request);
}
