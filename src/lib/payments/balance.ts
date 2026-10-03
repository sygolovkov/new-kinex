import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { mskMidnightUtc, mskMonthStartUtc } from "@/lib/time";
import { Decimal, round2, toDecimal } from "@/lib/money";
import type { Manager, Settings } from "@/generated/prisma/client";

export class WithdrawalError extends Error {
  constructor(
    public code: "active_withdrawal_exists" | "no_funds_available"
  ) {
    super(code);
  }
}

function commissionRates(manager: Pick<Manager, "commission">, settings: Pick<Settings, "paymentSystemCommission">) {
  const managerRate = toDecimal(manager.commission).div(100);
  const psRate = toDecimal(settings.paymentSystemCommission).div(100);
  return { managerRate, psRate, totalRate: managerRate.plus(psRate) };
}

export async function calculateAvailableBalance(
  managerId: string,
  opts?: { manager?: Manager; settings?: Settings }
) {
  const todayMidnight = mskMidnightUtc();

  const [manager, settings, agg] = await Promise.all([
    opts?.manager ?? prisma.manager.findUniqueOrThrow({ where: { id: managerId } }),
    opts?.settings ?? getSettings(),
    prisma.payment.aggregate({
      where: {
        managerId,
        status: "SUCCESS",
        isSettled: false,
        createdAt: { lt: todayMidnight },
      },
      _sum: { amount: true },
    }),
  ]);

  const total = toDecimal(agg._sum.amount ?? 0);
  const { totalRate } = commissionRates(manager, settings);
  return round2(total.times(new Decimal(1).minus(totalRate)));
}

export async function getBalanceStats(
  managerId: string,
  period: "today" | "month"
) {
  const since = period === "today" ? mskMidnightUtc() : mskMonthStartUtc();

  const [manager, settings, paymentsAgg, withdrawnAgg] = await Promise.all([
    prisma.manager.findUniqueOrThrow({ where: { id: managerId } }),
    getSettings(),
    prisma.payment.aggregate({
      where: { managerId, status: "SUCCESS", createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.withdrawal.aggregate({
      where: { managerId, status: "COMPLETED", updatedAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  const total = toDecimal(paymentsAgg._sum.amount ?? 0);
  const withdrawn = toDecimal(withdrawnAgg._sum.amount ?? 0);
  const { totalRate } = commissionRates(manager, settings);
  const netRate = new Decimal(1).minus(totalRate);

  const retainedFee = netRate.greaterThan(0)
    ? round2(withdrawn.times(totalRate).div(netRate))
    : new Decimal(0);

  const available = await calculateAvailableBalance(managerId, {
    manager,
    settings,
  });

  return { total, retainedFee, withdrawn, available };
}

type EligiblePaymentRow = { id: string; amount: string };

/**
 * Атомарно создаёт заявку на вывод, блокируя строку менеджера и подходящие
 * платежи через `FOR UPDATE`, чтобы исключить гонку при одновременных заявках
 * (аналог Django `select_for_update` из оригинала).
 */
export async function createWithdrawal(managerId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM managers WHERE id = ${managerId} FOR UPDATE`;

    const active = await tx.withdrawal.findFirst({
      where: { managerId, status: "PENDING" },
    });
    if (active) throw new WithdrawalError("active_withdrawal_exists");

    const todayMidnight = mskMidnightUtc();
    const eligiblePayments = await tx.$queryRaw<EligiblePaymentRow[]>`
      SELECT id, amount FROM payments
      WHERE manager_id = ${managerId}
        AND status = 'SUCCESS'
        AND is_settled = false
        AND created_at < ${todayMidnight}
      FOR UPDATE
    `;

    const total = eligiblePayments.reduce(
      (sum, p) => sum.plus(toDecimal(p.amount)),
      new Decimal(0)
    );

    const [manager, settings] = await Promise.all([
      tx.manager.findUniqueOrThrow({ where: { id: managerId } }),
      tx.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }),
    ]);
    const { totalRate } = commissionRates(manager, settings);
    const amount = round2(total.times(new Decimal(1).minus(totalRate)));

    if (amount.lessThanOrEqualTo(0)) {
      throw new WithdrawalError("no_funds_available");
    }

    const withdrawal = await tx.withdrawal.create({
      data: { managerId, amount },
    });

    if (eligiblePayments.length > 0) {
      await tx.payment.updateMany({
        where: { id: { in: eligiblePayments.map((p) => p.id) } },
        data: { isSettled: true },
      });
    }

    return withdrawal;
  });
}
