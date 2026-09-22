import { describe, expect, it } from "vitest";
import { createPaymentSchema } from "./payment";

describe("createPaymentSchema", () => {
  const validPayment = {
    payerOrgId: "org_1",
    amount: "300000",
    paymentMethod: "MOBILE_MONEY",
  };

  it("accepts a valid payment", () => {
    expect(createPaymentSchema.safeParse(validPayment).success).toBe(true);
  });

  it("rejects a zero amount", () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, amount: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, amount: "-500" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid payment method", () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, paymentMethod: "CRYPTO" });
    expect(result.success).toBe(false);
  });

  it("requires a payer organization", () => {
    const result = createPaymentSchema.safeParse({ ...validPayment, payerOrgId: "" });
    expect(result.success).toBe(false);
  });

  it("defaults the payment date to today when omitted", () => {
    const result = createPaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentDate).toBeInstanceOf(Date);
    }
  });
});
