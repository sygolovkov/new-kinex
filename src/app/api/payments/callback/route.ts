import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusFromCode } from "@/lib/payments/status";
import { notifyManagerAboutPayment } from "@/lib/telegram";

type CallbackBody = {
  order_id?: unknown;
  amount?: unknown;
  timestamp?: unknown;
  sign?: unknown;
  status_code?: unknown;
  transaction_id?: unknown;
};

function verifySignature(
  orderId: string,
  amount: string,
  timestamp: string,
  sign: string
): boolean {
  const apiKey = process.env.PAYMENT_API_KEY;
  if (!apiKey) return false;

  const signStr =
    `${orderId.length}${orderId}` +
    `${amount.length}${amount}` +
    `${timestamp.length}${timestamp}`;
  const expected = createHmac("sha1", apiKey).update(signStr).digest("hex");

  const a = Buffer.from(sign, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let body: CallbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const orderId = String(body.order_id ?? "");
  const amount = String(body.amount ?? "");
  const timestamp = String(body.timestamp ?? "");
  const sign = String(body.sign ?? "");

  if (!verifySignature(orderId, amount, timestamp, sign)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: { manager: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rawStatusCode = body.status_code;
  const statusCode =
    typeof rawStatusCode === "number" ? rawStatusCode : Number(rawStatusCode);
  const newStatus = statusFromCode(statusCode);
  if (newStatus === null) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  // Финальный статус SUCCESS необратим — откат в ERROR/иной статус запрещён.
  if (payment.status === "SUCCESS" && newStatus !== "SUCCESS") {
    return NextResponse.json({ ok: true });
  }

  const transactionId =
    typeof body.transaction_id === "string" && body.transaction_id
      ? body.transaction_id
      : payment.transactionId;

  const updated = await prisma.payment.update({
    where: { orderId },
    data: { status: newStatus, transactionId },
    include: { manager: true },
  });

  await notifyManagerAboutPayment(updated);

  return NextResponse.json({ ok: true });
}
