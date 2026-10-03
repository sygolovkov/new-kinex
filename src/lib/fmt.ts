import { toDecimal, type Money } from "@/lib/money";

/** "1,234.56" — формат RUB-сумм, как у Python `{:,.2f}`. */
export function fmtRub(value: Money): string {
  return toDecimal(value).toNumber().toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "1234.56" — формат USDT-сумм без разделителя тысяч, как у Python `Decimal.quantize`. */
export function fmtUsdt(value: Money): string {
  return toDecimal(value).toDecimalPlaces(2).toFixed(2);
}

export function usdtSuffix(rub: Money, rate: Money): string {
  const r = toDecimal(rate);
  if (!r.greaterThan(0)) return "";
  const usdt = toDecimal(rub).div(r).toDecimalPlaces(2);
  return ` (~${fmtUsdt(usdt)} USDT)`;
}
