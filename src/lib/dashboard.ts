import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getUsdtRate } from "@/lib/usdt";
import { Decimal, round2, sumDecimals, toDecimal } from "@/lib/money";
import { mskHourOfDay, mskMidnightUtc, mskMonthStartUtc } from "@/lib/time";

function dynamics(current: Decimal, previous: Decimal): number | null {
  if (previous.greaterThan(0)) {
    return current.minus(previous).div(previous).times(100).toDecimalPlaces(1).toNumber();
  }
  return null;
}

async function paymentAgg(where: Parameters<typeof prisma.payment.aggregate>[0]["where"]) {
  const agg = await prisma.payment.aggregate({
    where: { ...where, status: "SUCCESS" },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return { sum: toDecimal(agg._sum.amount ?? 0), count: agg._count._all };
}

/**
 * "Прибыль" здесь — сумма комиссий менеджеров с успешных платежей (без учёта
 * комиссии платёжной системы), в точности как в оригинальном `_calc_profit`.
 */
async function calcProfit(createdAtFilter: { gte?: Date; lt?: Date }) {
  const payments = await prisma.payment.findMany({
    where: { status: "SUCCESS", managerId: { not: null }, createdAt: createdAtFilter },
    select: { amount: true, manager: { select: { commission: true } } },
  });
  const total = sumDecimals(
    payments.map((p) => toDecimal(p.amount).times(toDecimal(p.manager!.commission)).div(100))
  );
  return round2(total);
}

export async function getDashboardStats() {
  const now = new Date();
  const today = mskMidnightUtc(now);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const monthStart = mskMonthStartUtc(now);
  const prevMonthStart = mskMonthStartUtc(new Date(monthStart.getTime() - 24 * 60 * 60 * 1000));

  const [managersTotal, managersActive] = await Promise.all([
    prisma.manager.count(),
    prisma.manager.count({ where: { isActive: true } }),
  ]);

  const [payToday, payYesterday, payMonth] = await Promise.all([
    paymentAgg({ createdAt: { gte: today } }),
    paymentAgg({ createdAt: { gte: yesterday, lt: today } }),
    paymentAgg({ createdAt: { gte: monthStart } }),
  ]);

  const [profitToday, profitYesterday, profitWeek, profitPrevWeek, profitMonth, profitPrevMonth] =
    await Promise.all([
      calcProfit({ gte: today }),
      calcProfit({ gte: yesterday, lt: today }),
      calcProfit({ gte: weekStart }),
      calcProfit({ gte: prevWeekStart, lt: weekStart }),
      calcProfit({ gte: monthStart }),
      calcProfit({ gte: prevMonthStart, lt: monthStart }),
    ]);

  const [allToday, allYesterday, activeNow, activePrev] = await Promise.all([
    prisma.payment.count({ where: { createdAt: { gte: today } } }),
    prisma.payment.count({ where: { createdAt: { gte: yesterday, lt: today } } }),
    prisma.payment.count({ where: { status: "IN_PROCESS" } }),
    prisma.payment.count({
      where: { status: "IN_PROCESS", createdAt: { gte: yesterday, lt: today } },
    }),
  ]);

  const todaysSuccessPayments = await prisma.payment.findMany({
    where: { status: "SUCCESS", createdAt: { gte: today } },
    select: { createdAt: true },
  });
  const hourlyData = Array.from({ length: 24 }, () => 0);
  for (const p of todaysSuccessPayments) {
    hourlyData[mskHourOfDay(p.createdAt)] += 1;
  }
  const hourlyLabels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  const settings = await getSettings();
  const usdtRate = await getUsdtRate();
  const toUsdt = (rub: Decimal) =>
    usdtRate.greaterThan(0) ? round2(rub.div(usdtRate)) : new Decimal(0);

  const withdrawalLimit = toDecimal(settings.withdrawalLimit);
  const psRate = toDecimal(settings.paymentSystemCommission).div(100);

  const totalGrossAgg = await prisma.payment.aggregate({
    where: { status: "SUCCESS" },
    _sum: { amount: true },
  });
  const totalGross = toDecimal(totalGrossAgg._sum.amount ?? 0);

  const unsettledPayments = await prisma.payment.findMany({
    where: {
      status: "SUCCESS",
      isSettled: false,
      createdAt: { lt: today },
      managerId: { not: null },
    },
    select: { amount: true, manager: { select: { commission: true } } },
  });
  const availableTotal = round2(
    sumDecimals(
      unsettledPayments.map((p) => {
        const amount = toDecimal(p.amount);
        const managerRate = toDecimal(p.manager!.commission).div(100);
        return amount.times(new Decimal(1).minus(psRate)).minus(amount.times(managerRate));
      })
    )
  );
  const limitProgress = withdrawalLimit.greaterThan(0)
    ? Math.min(availableTotal.div(withdrawalLimit).times(100).toDecimalPlaces(1).toNumber(), 100)
    : 0;

  const [pendingProfile, pendingWithdrawal] = await Promise.all([
    prisma.profileChangeRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawal.count({ where: { status: "PENDING" } }),
  ]);

  const [pendingWithdrawalsList, pendingProfileList, recentPayments] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { status: "PENDING" },
      include: { manager: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profileChangeRequest.findMany({
      where: { status: "PENDING" },
      include: { manager: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      include: { manager: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    managers: { total: managersTotal, active: managersActive, inactive: managersTotal - managersActive },
    payToday,
    payMonth,
    dynPayCount: dynamics(new Decimal(payToday.count), new Decimal(payYesterday.count)),
    dynPaySum: dynamics(payToday.sum, payYesterday.sum),
    pendingProfile,
    pendingWithdrawal,
    pendingTotal: pendingProfile + pendingWithdrawal,
    profitToday,
    profitTodayUsdt: toUsdt(profitToday),
    profitWeek,
    profitWeekUsdt: toUsdt(profitWeek),
    profitMonth,
    profitMonthUsdt: toUsdt(profitMonth),
    dynToday: dynamics(profitToday, profitYesterday),
    dynWeek: dynamics(profitWeek, profitPrevWeek),
    dynMonth: dynamics(profitMonth, profitPrevMonth),
    usdtRate,
    allTodayCount: allToday,
    dynAllCount: dynamics(new Decimal(allToday), new Decimal(allYesterday)),
    activeCount: activeNow,
    dynActive: dynamics(new Decimal(activeNow), new Decimal(activePrev)),
    hourlyLabels,
    hourlyData,
    totalGross,
    totalGrossUsdt: toUsdt(totalGross),
    availableTotal,
    availableTotalUsdt: toUsdt(availableTotal),
    withdrawalLimit,
    limitProgress,
    pendingWithdrawalsList,
    pendingProfileList,
    recentPayments,
  };
}
