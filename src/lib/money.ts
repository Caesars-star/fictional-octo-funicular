import { Prisma } from "@prisma/client";

/**
 * All monetary/quantity math must go through Prisma.Decimal — never
 * JavaScript floats — so line totals and BOQ/quotation totals stay exact.
 */
export function multiplyDecimal(
  a: Prisma.Decimal.Value,
  b: Prisma.Decimal.Value,
): Prisma.Decimal {
  return new Prisma.Decimal(a).mul(new Prisma.Decimal(b));
}

export function sumDecimal(values: Prisma.Decimal.Value[]): Prisma.Decimal {
  return values.reduce(
    (acc: Prisma.Decimal, v) => acc.add(new Prisma.Decimal(v)),
    new Prisma.Decimal(0),
  );
}
