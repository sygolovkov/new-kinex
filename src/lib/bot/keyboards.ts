import { InlineKeyboard, Keyboard } from "grammy";

export const MENU = new Keyboard()
  .text("🔗 Генерация линка")
  .text("💳 Платежи")
  .row()
  .text("💰 Баланс")
  .text("📤 Вывод")
  .row()
  .text("👤 Профиль")
  .text("🆘 Поддержка")
  .resized();

export const SKIP_KB = new Keyboard()
  .text("Пропустить")
  .text("Отмена")
  .resized();

export const CANCEL_KB = new Keyboard().text("Отмена").resized();

export const CONFIRM_KB = new InlineKeyboard()
  .text("✅ Подтвердить", "pay_confirm")
  .text("❌ Отменить", "pay_cancel");

export const BAL_PERIODS: [string, string][] = [
  ["today", "Сегодня"],
  ["month", "Месяц"],
];
export const BAL_PERIOD_LABEL: Record<string, string> = {
  today: "сегодня",
  month: "за месяц",
};

export function balanceKb(period: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const [p, label] of BAL_PERIODS) {
    kb.text(p === period ? `✓ ${label}` : label, `bal:${p}`);
  }
  return kb;
}

export const PERIODS: [string, string][] = [
  ["day", "День"],
  ["week", "Неделя"],
  ["month", "Месяц"],
];
export const STATUSES: [string, string][] = [
  ["all", "Все"],
  ["in_process", "В процессе"],
  ["success", "Успешно"],
];
export const PERIOD_LABEL: Record<string, string> = {
  day: "день",
  week: "неделю",
  month: "месяц",
};
export const STATUS_LABEL: Record<string, string> = {
  all: "все",
  in_process: "в процессе",
  success: "успешно",
};

export function paymentsKb(period: string, status: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const [p, label] of PERIODS) {
    kb.text(p === period ? `✓ ${label}` : label, `pay_list:${p}:${status}`);
  }
  kb.row();
  for (const [s, label] of STATUSES) {
    kb.text(s === status ? `✓ ${label}` : label, `pay_list:${period}:${s}`);
  }
  return kb;
}

export const WITHDRAW_CONFIRM_KB = new InlineKeyboard()
  .text("✅ Подать заявку", "withdraw_confirm")
  .text("❌ Отмена", "withdraw_cancel");

export const PROFILE_KB = new InlineKeyboard()
  .text("📧 Изменить email", "profile_change:email")
  .text("💳 Изменить USDT кошелёк", "profile_change:usdt_wallet");
