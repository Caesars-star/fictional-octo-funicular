import { describe, expect, it } from "vitest";
import { createRfqSchema, submitQuotationSchema } from "./rfq";

describe("createRfqSchema", () => {
  it("rejects an RFQ with no BOQ items selected", () => {
    const result = createRfqSchema.safeParse({ title: "Cement RFQ", boqItemIds: [] });
    expect(result.success).toBe(false);
  });

  it("defaults to no suppliers invited yet (draft RFQ)", () => {
    const result = createRfqSchema.safeParse({ title: "Cement RFQ", boqItemIds: ["item_1"] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.supplierIds).toEqual([]);
  });
});

describe("submitQuotationSchema", () => {
  const validQuotation = {
    supplierId: "sup_1",
    items: [{ rfqItemId: "rfqitem_1", unitPrice: "850" }],
  };

  it("accepts a valid quotation and defaults delivery/tax to zero", () => {
    const result = submitQuotationSchema.safeParse(validQuotation);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryCost).toBe("0");
      expect(result.data.taxAmount).toBe("0");
    }
  });

  it("rejects a quotation with no priced items", () => {
    const result = submitQuotationSchema.safeParse({ ...validQuotation, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = submitQuotationSchema.safeParse({
      ...validQuotation,
      items: [{ rfqItemId: "rfqitem_1", unitPrice: "-1" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative delivery cost", () => {
    const result = submitQuotationSchema.safeParse({ ...validQuotation, deliveryCost: "-50" });
    expect(result.success).toBe(false);
  });
});
