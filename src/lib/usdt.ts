import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { Decimal, toDecimal } from "@/lib/money";
import type { Prisma } from "@/generated/prisma/client";

const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Курс USDT/RUB с TTL-кэшем в БД (а не в памяти процесса — в serverless-среде
 * in-memory кэш не переживает холодный старт и не шарится между инстансами).
 * При ошибке CoinGecko возвращается последний известный курс из БД, даже если
 * он устарел — это резервное значение "лучше, чем ничего", как в оригинале.
 */
export async function getUsdtRate(): Promise<Prisma.Decimal> {
  const settings = await getSettings();
  const cachedRate = settings.lastUsdtRate ? toDecimal(settings.lastUsdtRate) : new Decimal(0);
  const cachedAt = settings.lastUsdtRateAt?.getTime();

  if (cachedAt && Date.now() - cachedAt < CACHE_TTL_MS && cachedRate.greaterThan(0)) {
    return cachedRate;
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=rub",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    const data = (await res.json()) as { tether?: { rub?: number } };
    const rawRate = data.tether?.rub;
    if (rawRate === undefined || Number.isNaN(rawRate)) {
      throw new Error("Unexpected CoinGecko response shape");
    }

    const rate = toDecimal(rawRate);
    await prisma.settings.update({
      where: { id: 1 },
      data: { lastUsdtRate: rate, lastUsdtRateAt: new Date() },
    });
    return rate;
  } catch {
    return cachedRate;
  }
}
