import { ensureAdminUser } from "@/lib/bootstrapAdmin";
import { ensureBotWebhook } from "@/lib/bootstrapBotWebhook";

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (username && password) {
  try {
    const admin = await ensureAdminUser(username, password);
    console.log(`[instrumentation] Администратор "${admin.username}" создан/обновлён.`);
  } catch (err) {
    console.error("[instrumentation] Не удалось создать администратора при старте:", err);
  }
}

const appUrl = process.env.APP_URL;

if (appUrl) {
  try {
    const webhookUrl = await ensureBotWebhook(appUrl);
    console.log(`[instrumentation] Webhook бота зарегистрирован: ${webhookUrl}`);
  } catch (err) {
    // Не критично при первом деплое: токен бота может быть ещё не задан в Settings/BOT_TOKEN.
    console.error("[instrumentation] Не удалось зарегистрировать webhook бота при старте:", err);
  }
}
