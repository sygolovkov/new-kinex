import { Composer } from "grammy";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getUsdtRate } from "@/lib/usdt";
import {
  calculateAvailableBalance,
  createWithdrawal,
  getBalanceStats,
  WithdrawalError,
} from "@/lib/payments/balance";
import { createPayment } from "@/lib/payments/genesisPay";
import { PAYMENT_STATUS_EMOJI } from "@/lib/payments/status";
import { fmtRub, usdtSuffix } from "@/lib/fmt";
import { formatMskDateTime } from "@/lib/time";
import { initialSession } from "@/lib/bot/session";
import type { MyContext } from "@/lib/bot/types";
import {
  BAL_PERIOD_LABEL,
  CANCEL_KB,
  CONFIRM_KB,
  MENU,
  PERIOD_LABEL,
  PROFILE_KB,
  SKIP_KB,
  STATUS_LABEL,
  WITHDRAW_CONFIRM_KB,
  balanceKb,
  paymentsKb,
} from "@/lib/bot/keyboards";
import type { Manager } from "@/generated/prisma/client";

export const botComposer = new Composer<MyContext>();

botComposer.command("start", async (ctx) => {
  ctx.session = initialSession();
  await ctx.reply("Выберите раздел:", { reply_markup: MENU });
});

// ── Генерация линка ──────────────────────────────────────────────────────

async function linkStart(ctx: MyContext) {
  ctx.session.state = "link_description";
  await ctx.reply("Кому назначается платёж? (необязательно)", {
    reply_markup: SKIP_KB,
  });
}

async function linkDescription(ctx: MyContext, text: string) {
  if (text === "Отмена") {
    ctx.session = initialSession();
    await ctx.reply("Выберите раздел:", { reply_markup: MENU });
    return;
  }
  ctx.session.description = text === "Пропустить" ? "" : text;
  ctx.session.state = "link_amount";
  await ctx.reply("Введите сумму платежа (RUB):", { reply_markup: CANCEL_KB });
}

async function linkAmount(ctx: MyContext, text: string) {
  if (text === "Отмена") {
    ctx.session = initialSession();
    await ctx.reply("Выберите раздел:", { reply_markup: MENU });
    return;
  }

  const amount = Number((text || "").replace(",", "."));
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    await ctx.reply("Введите корректную сумму:");
    return;
  }

  const description = ctx.session.description || "—";
  ctx.session.amount = amount;
  ctx.session.state = "link_confirm";

  await ctx.reply(
    `Подтвердите платёж:\n\n💰 Сумма: ${amount.toFixed(2)} RUB\n📝 Назначение: ${description}`,
    { reply_markup: { remove_keyboard: true } }
  );
  await ctx.reply("Подтвердить?", { reply_markup: CONFIRM_KB });
}

async function linkCancel(ctx: MyContext) {
  ctx.session = initialSession();
  await ctx.answerCallbackQuery();
  await ctx.reply("Выберите раздел:", { reply_markup: MENU });
}

async function linkConfirm(ctx: MyContext, manager: Manager) {
  const { amount, description } = ctx.session;
  ctx.session = initialSession();
  await ctx.answerCallbackQuery();
  await ctx.reply("Создаю платёж...");

  if (!amount) return;

  let result: Awaited<ReturnType<typeof createPayment>>;
  try {
    result = await createPayment({
      amount,
      description: description ?? "",
      managerId: manager.id,
    });
  } catch {
    await ctx.reply("⚠️ Ошибка связи с платёжной системой. Попробуйте позже.", {
      reply_markup: MENU,
    });
    return;
  }

  const statusCode = result.status_code;
  if (statusCode !== 0 && statusCode !== 1) {
    const detail = result.description ? `\n\nПричина: ${result.description}` : "";
    await ctx.reply(`❌ Не удалось создать платёж.${detail}`, {
      reply_markup: MENU,
    });
    return;
  }

  let text = "✅ Платёж создан\n\n";
  if (result.url) {
    text += `🔗 Ссылка: ${result.url}`;
  } else if (result.qr_code?.payload) {
    text += `QR: ${result.qr_code.payload}`;
  }
  await ctx.reply(text, { reply_markup: MENU });
}

// ── Баланс ───────────────────────────────────────────────────────────────

function balanceText(
  stats: Awaited<ReturnType<typeof getBalanceStats>>,
  period: string,
  rate: ReturnType<typeof getUsdtRate> extends Promise<infer T> ? T : never
) {
  const label = BAL_PERIOD_LABEL[period];
  const lines = [`💰 Баланс ${label}\n`];
  if (rate.greaterThan(0)) {
    lines.push(`💱 Курс USDT сегодня: ${fmtRub(rate)} RUB\n`);
  }
  lines.push(
    `✅ Успешных платежей:   ${fmtRub(stats.total)} RUB${usdtSuffix(stats.total, rate)}`
  );
  lines.push(
    `📤 Выведено:            ${fmtRub(stats.withdrawn)} RUB${usdtSuffix(stats.withdrawn, rate)}`
  );
  lines.push(
    `🏦 Удержано комиссий:   ${fmtRub(stats.retainedFee)} RUB${usdtSuffix(stats.retainedFee, rate)}`
  );
  lines.push(
    `\n💵 Доступно к выводу: ${fmtRub(stats.available)} RUB${usdtSuffix(stats.available, rate)}`
  );
  return lines.join("\n");
}

async function balanceStart(ctx: MyContext, manager: Manager) {
  const [stats, rate] = await Promise.all([
    getBalanceStats(manager.id, "today"),
    getUsdtRate(),
  ]);
  await ctx.reply(balanceText(stats, "today", rate), {
    reply_markup: balanceKb("today"),
  });
}

async function balanceFilter(ctx: MyContext, manager: Manager, data: string) {
  const period = data.split(":")[1];
  if (period !== "today" && period !== "month") {
    await ctx.answerCallbackQuery();
    return;
  }
  const [stats, rate] = await Promise.all([
    getBalanceStats(manager.id, period),
    getUsdtRate(),
  ]);
  await ctx.editMessageText(balanceText(stats, period, rate), {
    reply_markup: balanceKb(period),
  });
  await ctx.answerCallbackQuery();
}

// ── Платежи ──────────────────────────────────────────────────────────────

const PERIOD_DELTA_MS: Record<string, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

async function fetchPayments(managerId: string, period: string, status: string) {
  const since = new Date(Date.now() - (PERIOD_DELTA_MS[period] ?? PERIOD_DELTA_MS.day));
  return prisma.payment.findMany({
    where: {
      managerId,
      createdAt: { gte: since },
      ...(status === "in_process"
        ? { status: "IN_PROCESS" as const }
        : status === "success"
          ? { status: "SUCCESS" as const }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}

function paymentsText(
  payments: Awaited<ReturnType<typeof fetchPayments>>,
  period: string,
  status: string
) {
  const header = `💳 Платежи за ${PERIOD_LABEL[period]} · ${STATUS_LABEL[status]}\n\n`;
  if (payments.length === 0) return header + "Платежей не найдено.";

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const lines = [`Найдено: ${payments.length} | Сумма: ${fmtRub(total)} RUB\n`];
  for (const p of payments) {
    const emoji = PAYMENT_STATUS_EMOJI[p.status];
    const desc =
      p.description.length > 30
        ? `${p.description.slice(0, 30)}…`
        : p.description || "—";
    lines.push(`${emoji} ${fmtRub(p.amount)} RUB · ${desc}`);
  }
  return header + lines.join("\n");
}

async function paymentsStart(ctx: MyContext, manager: Manager) {
  const payments = await fetchPayments(manager.id, "day", "all");
  await ctx.reply(paymentsText(payments, "day", "all"), {
    reply_markup: paymentsKb("day", "all"),
  });
}

async function paymentsFilter(ctx: MyContext, manager: Manager, data: string) {
  const [, period, status] = data.split(":");
  const payments = await fetchPayments(manager.id, period, status);
  await ctx.editMessageText(paymentsText(payments, period, status), {
    reply_markup: paymentsKb(period, status),
  });
  await ctx.answerCallbackQuery();
}

// ── Вывод средств ────────────────────────────────────────────────────────

async function getWithdrawalInfo(manager: Manager) {
  const [balance, active, rate] = await Promise.all([
    calculateAvailableBalance(manager.id, { manager }),
    prisma.withdrawal.findFirst({
      where: { managerId: manager.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    getUsdtRate(),
  ]);
  return { balance, active, rate };
}

async function withdrawalStart(ctx: MyContext, manager: Manager) {
  const { balance, active, rate } = await getWithdrawalInfo(manager);

  if (active) {
    const usdt = usdtSuffix(active.amount, rate);
    const rateLine = rate.greaterThan(0)
      ? `💱 Курс USDT сегодня: ${fmtRub(rate)} RUB\n\n`
      : "";
    await ctx.reply(
      `📤 Вывод средств\n\n${rateLine}У вас уже есть активная заявка на вывод.\n` +
        `💰 Сумма: ${fmtRub(active.amount)} RUB${usdt}\n` +
        `📅 Дата подачи: ${formatMskDateTime(active.createdAt)}\n\n` +
        `Заявка будет обработана администратором вручную.`
    );
    return;
  }

  if (!manager.usdtWallet) {
    await ctx.reply(
      "📤 Вывод средств\n\n⚠️ USDT-кошелёк не указан. Обратитесь к администратору для его добавления."
    );
    return;
  }

  if (!balance.greaterThan(0)) {
    await ctx.reply(
      "📤 Вывод средств\n\nДоступных средств для вывода нет.\n\n" +
        "К выводу учитываются успешные платежи, совершённые до начала текущего дня."
    );
    return;
  }

  const usdt = usdtSuffix(balance, rate);
  const rateLine = rate.greaterThan(0) ? `💱 Курс USDT сегодня: ${fmtRub(rate)} RUB\n` : "";
  await ctx.reply(
    `📤 Вывод средств\n\n${rateLine}Доступно к выводу: ${fmtRub(balance)} RUB${usdt}\n\n` +
      `Средства будут переведены на USDT-кошелёк:\n<code>${manager.usdtWallet}</code>\n\n` +
      `Подтвердите заявку:`,
    { parse_mode: "HTML", reply_markup: WITHDRAW_CONFIRM_KB }
  );
}

async function withdrawalCancel(ctx: MyContext) {
  await ctx.answerCallbackQuery();
  await ctx.reply("Выберите раздел:", { reply_markup: MENU });
}

async function withdrawalConfirm(ctx: MyContext, manager: Manager) {
  await ctx.answerCallbackQuery();

  const { balance, active } = await getWithdrawalInfo(manager);
  if (active) {
    await ctx.reply("⚠️ У вас уже есть активная заявка на вывод.", {
      reply_markup: MENU,
    });
    return;
  }
  if (!balance.greaterThan(0)) {
    await ctx.reply("⚠️ Нет доступных средств для вывода.", { reply_markup: MENU });
    return;
  }

  let withdrawal;
  try {
    withdrawal = await createWithdrawal(manager.id);
  } catch (err) {
    if (err instanceof WithdrawalError) {
      const text =
        err.code === "active_withdrawal_exists"
          ? "⚠️ У вас уже есть активная заявка на вывод."
          : "⚠️ Нет доступных средств для вывода.";
      await ctx.reply(text, { reply_markup: MENU });
    } else {
      await ctx.reply("⚠️ Ошибка при создании заявки. Попробуйте позже.", {
        reply_markup: MENU,
      });
    }
    return;
  }

  const rate = await getUsdtRate();
  const usdt = usdtSuffix(withdrawal.amount, rate);
  await ctx.reply(
    `✅ Заявка на вывод создана\n\n💰 Сумма: ${fmtRub(withdrawal.amount)} RUB${usdt}\n` +
      `Администратор обработает заявку вручную.`,
    { reply_markup: MENU }
  );
}

// ── Профиль ──────────────────────────────────────────────────────────────

const FIELD_LABEL: Record<string, string> = {
  email: "Email",
  usdt_wallet: "USDT кошелёк",
};

async function getActiveChangeRequest(managerId: string) {
  return prisma.profileChangeRequest.findFirst({
    where: { managerId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

function profileText(
  manager: Manager,
  active: Awaited<ReturnType<typeof getActiveChangeRequest>>
) {
  const lines = [
    "👤 Профиль\n",
    `📛 Имя:            ${manager.name || "—"}`,
    `📧 Email:          ${manager.email || "—"}`,
    `💳 USDT кошелёк:  ${manager.usdtWallet || "—"}`,
    `💹 Комиссия:       ${manager.commission}%`,
  ];
  if (active) {
    lines.push(
      `\n⏳ Активная заявка на изменение: ${FIELD_LABEL[active.field]}\n` +
        `   Новое значение: ${active.newValue}\n` +
        `   Ожидает обработки администратором.`
    );
  }
  return lines.join("\n");
}

async function profileStart(ctx: MyContext, manager: Manager) {
  const active = await getActiveChangeRequest(manager.id);
  await ctx.reply(profileText(manager, active), {
    reply_markup: active ? undefined : PROFILE_KB,
  });
}

async function profileChangeStart(ctx: MyContext, manager: Manager, data: string) {
  await ctx.answerCallbackQuery();

  const active = await getActiveChangeRequest(manager.id);
  if (active) {
    await ctx.reply(
      "⚠️ У вас уже есть активная заявка на изменение профиля. Дождитесь её обработки."
    );
    return;
  }

  const field = data.split(":")[1];
  if (field !== "email" && field !== "usdt_wallet") return;

  ctx.session.profileField = field;
  ctx.session.state = "profile_value";
  await ctx.reply(`Введите новый ${FIELD_LABEL[field]}:`, {
    reply_markup: CANCEL_KB,
  });
}

async function profileChangeValue(ctx: MyContext, text: string) {
  if (text === "Отмена") {
    ctx.session = initialSession();
    await ctx.reply("Выберите раздел:", { reply_markup: MENU });
    return;
  }

  const newValue = (text || "").trim();
  if (!newValue) {
    await ctx.reply("Значение не может быть пустым. Введите ещё раз:");
    return;
  }

  const field = ctx.session.profileField!;
  const managerId = ctx.manager!.id;
  ctx.session = initialSession();

  await prisma.profileChangeRequest.create({
    data: { managerId, field, newValue },
  });

  await ctx.reply(
    `✅ Заявка на изменение ${FIELD_LABEL[field]} отправлена.\nНовое значение: ${newValue}\n\n` +
      `Администратор рассмотрит заявку в ближайшее время.`,
    { reply_markup: MENU }
  );
}

// ── Поддержка ────────────────────────────────────────────────────────────

async function supportHandler(ctx: MyContext) {
  const settings = await getSettings();
  let text = "По всем вопросам обращайтесь к Администратору";
  if (settings.adminTelegramUsername) {
    text += `\n\n👤 @${settings.adminTelegramUsername.replace(/^@/, "")}`;
  }
  await ctx.reply(text);
}

// ── Маршрутизация ────────────────────────────────────────────────────────

botComposer.on("message:text", async (ctx) => {
  const manager = ctx.manager!;
  const text = ctx.message.text;
  const state = ctx.session.state;

  // Состояние диалога имеет приоритет над кнопками меню — ровно как в
  // оригинале на aiogram, где FSM-хендлер без текстового фильтра перехватывает
  // любой ввод, включая случайное нажатие другой кнопки меню.
  switch (state) {
    case "link_description":
      return linkDescription(ctx, text);
    case "link_amount":
      return linkAmount(ctx, text);
    case "profile_value":
      return profileChangeValue(ctx, text);
  }

  switch (text) {
    case "🔗 Генерация линка":
      return linkStart(ctx);
    case "💰 Баланс":
      return balanceStart(ctx, manager);
    case "💳 Платежи":
      return paymentsStart(ctx, manager);
    case "📤 Вывод":
      return withdrawalStart(ctx, manager);
    case "👤 Профиль":
      return profileStart(ctx, manager);
    case "🆘 Поддержка":
      return supportHandler(ctx);
  }
});

botComposer.on("callback_query:data", async (ctx) => {
  const manager = ctx.manager!;
  const data = ctx.callbackQuery.data;

  if (data === "pay_cancel" && ctx.session.state === "link_confirm") {
    return linkCancel(ctx);
  }
  if (data === "pay_confirm" && ctx.session.state === "link_confirm") {
    return linkConfirm(ctx, manager);
  }
  if (data.startsWith("bal:")) return balanceFilter(ctx, manager, data);
  if (data.startsWith("pay_list:")) return paymentsFilter(ctx, manager, data);
  if (data === "withdraw_cancel") return withdrawalCancel(ctx);
  if (data === "withdraw_confirm") return withdrawalConfirm(ctx, manager);
  if (data.startsWith("profile_change:")) {
    return profileChangeStart(ctx, manager, data);
  }

  await ctx.answerCallbackQuery();
});
