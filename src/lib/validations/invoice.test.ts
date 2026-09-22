import { describe, expect, it } from "vitest";
import { INVOICE_STATUS_TRANSITIONS, createInvoiceSchema } from "./invoice";

describe("createInvoiceSchema", () => {
  const validInvoice = {
    issuedByOrgId: "org_1",
    invoiceNumber: "JHS-2026-0458",
    subtotal: "470000",
  };

  it("accepts a valid invoice and defaults tax to zero", () => {
    const result = createInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.taxAmount).toBe("0");
  });

  it("rejects a blank invoice number", () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, invoiceNumber: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects a negative subtotal", () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, subtotal: "-100" });
    expect(result.success).toBe(false);
  });

  it("accepts a zero subtotal (e.g. a credit note)", () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, subtotal: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a negative tax amount", () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, taxAmount: "-1" });
    expect(result.success).toBe(false);
  });

  it("requires an issuing organization", () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, issuedByOrgId: "" });
    expect(result.success).toBe(false);
  });
});

describe("INVOICE_STATUS_TRANSITIONS", () => {
  it("allows the standard forward path from DRAFT to APPROVED", () => {
    expect(INVOICE_STATUS_TRANSITIONS.DRAFT).toContain("SUBMITTED");
    expect(INVOICE_STATUS_TRANSITIONS.SUBMITTED).toContain("UNDER_REVIEW");
    expect(INVOICE_STATUS_TRANSITIONS.UNDER_REVIEW).toContain("APPROVED");
  });

  it("never allows PARTIALLY_PAID or PAID as a direct PATCH target — only recompute sets them", () => {
    for (const transitions of Object.values(INVOICE_STATUS_TRANSITIONS)) {
      expect(transitions).not.toContain("PARTIALLY_PAID");
      expect(transitions).not.toContain("PAID");
    }
  });

  it("does not allow skipping straight from DRAFT to APPROVED", () => {
    expect(INVOICE_STATUS_TRANSITIONS.DRAFT).not.toContain("APPROVED");
  });

  it("treats PAID as terminal", () => {
    expect(INVOICE_STATUS_TRANSITIONS.PAID).toEqual([]);
  });

  it("allows a dispute to be resolved back to UNDER_REVIEW", () => {
    expect(INVOICE_STATUS_TRANSITIONS.DISPUTED).toEqual(["UNDER_REVIEW"]);
  });

  it("allows disputing an approved or partially-paid invoice", () => {
    expect(INVOICE_STATUS_TRANSITIONS.APPROVED).toContain("DISPUTED");
    expect(INVOICE_STATUS_TRANSITIONS.PARTIALLY_PAID).toContain("DISPUTED");
  });
});
