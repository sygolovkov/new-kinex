import { getBotToken } from "@/lib/settings";
import {
  PAYMENT_STATUS_EMOJI,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payments/status";
import type { Payment } from "@/generated/prisma/client";

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  opts?: { parseMode?: "HTML" }
): Promise<void> {
  try {
    const token = await getBotToken();
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts?.parseMode,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // уведомление необязательно — не должно ронять основной поток обработки платежа
  }
}

export async function notifyManagerAboutPayment(
  payment: Payment & { manager: { telegramId: string } | null }
): Promise<void> {
  if (!payment.manager?.telegramId) return;
  const chatId = Number(payment.manager.telegramId);
  if (Number.isNaN(chatId)) return;

  const emoji = PAYMENT_STATUS_EMOJI[payment.status];
  const statusLabel = PAYMENT_STATUS_LABEL[payment.status];
  let text =
    `${emoji} Статус платежа обновлён\n\n` +
    `💰 Сумма: ${payment.amount} ${payment.currency}\n` +
    `📝 Назначение: ${payment.description || "—"}\n` +
    `📊 Статус: ${statusLabel}`;

  if (payment.transactionId) {
    text += `\n🆔 Транзакция: ${payment.transactionId}`;
  }

  await sendTelegramMessage(chatId, text);
}
