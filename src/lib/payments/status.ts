import type { PaymentStatus } from "@/generated/prisma/enums";

/** Числовые коды статусов, которыми оперирует платёжный шлюз Genesis Pay. */
export const PAYMENT_STATUS_CODE = {
  CREATED: 0,
  IN_PROCESS: 1,
  SUCCESS: 2,
  ERROR: 6,
  SERVER_ERROR: -6,
} as const satisfies Record<PaymentStatus, number>;

const CODE_TO_STATUS = new Map<number, PaymentStatus>(
  Object.entries(PAYMENT_STATUS_CODE).map(([status, code]) => [
    code,
    status as PaymentStatus,
  ])
);

export function statusFromCode(code: number): PaymentStatus | null {
  return CODE_TO_STATUS.get(code) ?? null;
}

export function codeFromStatus(status: PaymentStatus): number {
  return PAYMENT_STATUS_CODE[status];
}

export const PAYMENT_STATUS_EMOJI: Record<PaymentStatus, string> = {
  CREATED: "🆕",
  IN_PROCESS: "⏳",
  SUCCESS: "✅",
  ERROR: "❌",
  SERVER_ERROR: "⚠️",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  CREATED: "Создан",
  IN_PROCESS: "В процессе",
  SUCCESS: "Успешно",
  ERROR: "Ошибка",
  SERVER_ERROR: "Ошибка сервера",
};
