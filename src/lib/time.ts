/**
 * Россия отменила переход на летнее время в 2014 году, поэтому Europe/Moscow —
 * это фиксированное смещение UTC+3 круглый год. Это позволяет вычислять
 * "полночь по московскому времени" простым сдвигом, без библиотек часовых поясов.
 */
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

export function mskMidnightUtc(ref: Date = new Date()): Date {
  const shifted = new Date(ref.getTime() + MSK_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - MSK_OFFSET_MS);
}

export function mskMonthStartUtc(ref: Date = new Date()): Date {
  const shifted = new Date(ref.getTime() + MSK_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  return new Date(Date.UTC(y, m, 1, 0, 0, 0) - MSK_OFFSET_MS);
}

export function mskHourOfDay(date: Date): number {
  return new Date(date.getTime() + MSK_OFFSET_MS).getUTCHours();
}

export function formatMskDateTime(date: Date): string {
  const shifted = new Date(date.getTime() + MSK_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(shifted.getUTCDate())}.${pad(shifted.getUTCMonth() + 1)}.${shifted.getUTCFullYear()} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}
