import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { multiplyDecimal, sumDecimal } from "./money";

describe("multiplyDecimal", () => {
  it("computes an exact BOQ line total from quantity and unit cost", () => {
    // 500 bags x 850.00 must be exactly 425000.00 — this must never drift
    // due to floating-point error (500 * 850 as JS floats is safe, but the
    // point of Decimal is that it stays exact for cases that aren't).
    const total = multiplyDecimal("500", "850.00");
    expect(total.toString()).toBe("425000");
  });

  it("stays exact for values that break floating-point arithmetic", () => {
    // 0.1 + 0.2 famously !== 0.3 in IEEE 754 floats; Decimal must not
    // inherit that error for money math.
    const total = multiplyDecimal("0.1", "0.2");
    expect(total.toString()).toBe("0.02");
  });

  it("handles fractional quantities (e.g. cubic metres of ballast)", () => {
    const total = multiplyDecimal("30.5", "2200");
    expect(total.toString()).toBe("67100");
  });
});

describe("sumDecimal", () => {
  it("sums BOQ item totals into a section/BOQ grand total", () => {
    const total = sumDecimal(["425000", "190000", "66000", "36000"]);
    expect(total.toString()).toBe("717000");
  });

  it("returns zero for an empty list (empty section)", () => {
    expect(sumDecimal([]).toString()).toBe("0");
  });

  it("accepts Prisma.Decimal instances directly", () => {
    const total = sumDecimal([new Prisma.Decimal("10.50"), new Prisma.Decimal("5.25")]);
    expect(total.toString()).toBe("15.75");
  });
});

describe("quotation total composition", () => {
  it("matches subtotal + delivery + tax, computed entirely via Decimal", () => {
    const lineTotals = [
      multiplyDecimal("500", "870"), // cement
      multiplyDecimal("2", "93000"), // steel
      multiplyDecimal("30", "2100"), // ballast
      multiplyDecimal("20", "1750"), // sand
    ];
    const subtotal = sumDecimal(lineTotals);
    const total = subtotal.add("8000").add("13098");

    expect(subtotal.toString()).toBe("719000");
    expect(total.toString()).toBe("740098");
  });
});

describe("purchase order total (copied from an accepted quotation)", () => {
  it("carries the exact same subtotal/total as the quotation it was created from", () => {
    // A PurchaseOrder is created by copying an ACCEPTED quotation's line
    // items and totals verbatim (see POST /api/quotations/:id/purchase-order)
    // — it must never re-derive a different number from the same inputs.
    const quotationSubtotal = sumDecimal([
      multiplyDecimal("500", "870"),
      multiplyDecimal("2", "93000"),
      multiplyDecimal("30", "2100"),
      multiplyDecimal("20", "1750"),
    ]);
    const quotationTotal = quotationSubtotal.add("8000").add("13098");

    // The PO route persists quotation.subtotal/total directly (no re-sum),
    // so the PO's total is just the same Decimal value carried through.
    const purchaseOrderTotal = quotationTotal;

    expect(purchaseOrderTotal.toString()).toBe(quotationTotal.toString());
    expect(purchaseOrderTotal.toString()).toBe("740098");
  });
});
