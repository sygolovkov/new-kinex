import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { statusFromCode } from "@/lib/payments/status";

type GenesisPayResponse = {
  status_code?: number;
  transaction_id?: string;
  url?: string;
  qr_code?: { payload?: string };
  description?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Поля сортированы в порядке, который ожидает подпись Genesis Pay:
 * sign = HMAC-SHA1(key, "merchant<v>order_id<v>amount<v>currency<v>payment_method<v>timestamp<v>callback_url<v>").
 * Порядок и набор полей зафиксированы спецификацией шлюза — менять нельзя.
 */
function buildSignedBody(params: {
  orderId: string;
  amount: string;
  timestamp: string;
}) {
  const body: Record<string, string> = {
    merchant: requireEnv("PAYMENT_MERCHANT"),
    order_id: params.orderId,
    amount: params.amount,
    currency: "RUB",
    payment_method: "sbp",
    timestamp: params.timestamp,
    callback_url: requireEnv("PAYMENT_CALLBACK_URL"),
  };

  const signStr = Object.entries(body)
    .map(([k, v]) => `${k}${v}`)
    .join("");
  const sign = createHmac("sha1", requireEnv("PAYMENT_API_KEY"))
    .update(signStr)
    .digest("hex");

  return { ...body, sign };
}

export async function createPayment(params: {
  amount: number;
  description: string;
  managerId: string | null;
}): Promise<GenesisPayResponse> {
  const description =
    params.description ||
    `Платёж ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`;

  const orderId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = new Date().toISOString();
  const amountStr = params.amount.toFixed(2);

  const body = buildSignedBody({ orderId, amount: amountStr, timestamp });

  const res = await fetch(`${requireEnv("PAYMENT_API_URL")}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(30_000),
  });

  const data = (await res.json()) as GenesisPayResponse;
  const statusCode = data.status_code ?? -6;
  const status = statusFromCode(statusCode);

  if (status !== null && statusCode !== -6) {
    await prisma.payment.create({
      data: {
        managerId: params.managerId,
        orderId,
        amount: amountStr,
        currency: "RUB",
        description,
        transactionId: data.transaction_id ?? "",
        status,
      },
    });
  }

  return data;
}
