import { describe, expect, it } from "vitest";
import { COMMISSION_STATUS_TRANSITIONS, createCommissionSchema } from "./commission";

describe("createCommissionSchema", () => {
  it("accepts a minimal valid commission", () => {
    const result = createCommissionSchema.safeParse({
      sourceType: "LEAD_CONVERSION",
      amount: "150000",
    });
    expect(result.success).toBe(true);
  });

  it("coerces a numeric amount to a string", () => {
    const result = createCommissionSchema.safeParse({ sourceType: "OTHER", amount: 150000 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe("150000");
  });

  it("rejects a missing amount", () => {
    const result = createCommissionSchema.safeParse({ sourceType: "LEAD_CONVERSION" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid source type", () => {
    const result = createCommissionSchema.safeParse({ sourceType: "BONUS", amount: "1000" });
    expect(result.success).toBe(false);
  });
});

describe("COMMISSION_STATUS_TRANSITIONS", () => {
  it("allows the standard forward path from PENDING to PAID", () => {
    expect(COMMISSION_STATUS_TRANSITIONS.PENDING).toContain("APPROVED");
    expect(COMMISSION_STATUS_TRANSITIONS.APPROVED).toContain("PAID");
  });

  it("allows cancellation from PENDING or APPROVED", () => {
    expect(COMMISSION_STATUS_TRANSITIONS.PENDING).toContain("CANCELLED");
    expect(COMMISSION_STATUS_TRANSITIONS.APPROVED).toContain("CANCELLED");
  });

  it("treats PAID and CANCELLED as terminal", () => {
    expect(COMMISSION_STATUS_TRANSITIONS.PAID).toEqual([]);
    expect(COMMISSION_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("does not allow skipping straight from PENDING to PAID", () => {
    expect(COMMISSION_STATUS_TRANSITIONS.PENDING).not.toContain("PAID");
  });
});
