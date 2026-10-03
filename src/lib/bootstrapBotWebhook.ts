import { getBotToken } from "@/lib/settings";

export async function ensureBotWebhook(appUrl: string) {
  const token = await getBotToken();
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/bot/webhook`;
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: secretToken }),
    signal: AbortSignal.timeout(10_000),
  });

  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram setWebhook failed: ${data.description ?? "unknown error"}`);
  }
  return webhookUrl;
}
