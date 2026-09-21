import { describe, expect, it } from "vitest";
import { createBoqItemSchema, updateBoqItemSchema } from "./boq";

const validItem = {
  boqSectionId: "sec_1",
  description: "Portland Cement 50kg",
  quantity: "500",
  unit: "bag",
  estimatedUnitCost: "850",
};

describe("createBoqItemSchema", () => {
  it("accepts a valid item", () => {
    expect(createBoqItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("rejects a zero quantity", () => {
    const result = createBoqItemSchema.safeParse({ ...validItem, quantity: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative quantity", () => {
    const result = createBoqItemSchema.safeParse({ ...validItem, quantity: "-5" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit cost", () => {
    const result = createBoqItemSchema.safeParse({ ...validItem, estimatedUnitCost: "-1" });
    expect(result.success).toBe(false);
  });

  it("accepts a zero unit cost (e.g. a donated material)", () => {
    const result = createBoqItemSchema.safeParse({ ...validItem, estimatedUnitCost: "0" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank description", () => {
    const result = createBoqItemSchema.safeParse({ ...validItem, description: "  " });
    expect(result.success).toBe(false);
  });
});

describe("updateBoqItemSchema", () => {
  it("allows a partial update with only procurement status", () => {
    const result = updateBoqItemSchema.safeParse({ procurementStatus: "DELIVERED" });
    expect(result.success).toBe(true);
  });

  it("rejects a negative actual unit cost", () => {
    const result = updateBoqItemSchema.safeParse({ actualUnitCost: "-10" });
    expect(result.success).toBe(false);
  });

  it("allows clearing the assigned supplier", () => {
    const result = updateBoqItemSchema.safeParse({ supplierId: null });
    expect(result.success).toBe(true);
  });
});
