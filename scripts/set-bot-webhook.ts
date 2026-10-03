import { prisma } from "@/lib/prisma";
import { ensureBotWebhook } from "@/lib/bootstrapBotWebhook";

async function main() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error("Укажите APP_URL (например, https://your-domain.ru) в переменных окружения.");
    process.exit(1);
  }

  const webhookUrl = await ensureBotWebhook(appUrl);
  console.log(`Webhook зарегистрирован: ${webhookUrl}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
