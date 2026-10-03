import { Prisma } from "@/generated/prisma/client";

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
export type Money = Prisma.Decimal | number | string;

export function toDecimal(value: Money): Prisma.Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function round2(value: Money): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(2);
}

export function sumDecimals(values: Money[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (acc, v) => acc.plus(toDecimal(v)),
    new Decimal(0)
  );
}
