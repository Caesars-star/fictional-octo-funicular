import { describe, expect, it } from "vitest";
import { PO_STATUS_TRANSITIONS, createPurchaseOrderSchema } from "./purchase-order";

describe("createPurchaseOrderSchema", () => {
  it("accepts an empty payload (terms/expected delivery are optional)", () => {
    expect(createPurchaseOrderSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a payload with terms and an expected delivery date", () => {
    const result = createPurchaseOrderSchema.safeParse({
      expectedDeliveryDate: "2026-10-01",
      terms: "Net 30",
    });
    expect(result.success).toBe(true);
  });
});

describe("PO_STATUS_TRANSITIONS", () => {
  it("allows the standard forward path from DRAFT to COMPLETED", () => {
    expect(PO_STATUS_TRANSITIONS.DRAFT).toContain("ISSUED");
    expect(PO_STATUS_TRANSITIONS.ISSUED).toContain("ACCEPTED");
    expect(PO_STATUS_TRANSITIONS.ACCEPTED).toContain("COMPLETED");
  });

  it("allows cancellation from any non-terminal status", () => {
    expect(PO_STATUS_TRANSITIONS.DRAFT).toContain("CANCELLED");
    expect(PO_STATUS_TRANSITIONS.ISSUED).toContain("CANCELLED");
    expect(PO_STATUS_TRANSITIONS.ACCEPTED).toContain("CANCELLED");
  });

  it("does not allow skipping straight from DRAFT to COMPLETED", () => {
    expect(PO_STATUS_TRANSITIONS.DRAFT).not.toContain("COMPLETED");
  });

  it("treats COMPLETED and CANCELLED as terminal (no further transitions)", () => {
    expect(PO_STATUS_TRANSITIONS.COMPLETED).toEqual([]);
    expect(PO_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("does not allow reviving a cancelled purchase order", () => {
    expect(PO_STATUS_TRANSITIONS.CANCELLED).not.toContain("ISSUED");
  });
});
