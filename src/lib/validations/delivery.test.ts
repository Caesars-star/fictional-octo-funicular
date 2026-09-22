import { describe, expect, it } from "vitest";
import { DELIVERY_STATUS_TRANSITIONS, createDeliverySchema } from "./delivery";

describe("createDeliverySchema", () => {
  const validDelivery = {
    items: [{ purchaseOrderItemId: "poitem_1", quantity: "500" }],
  };

  it("accepts a valid delivery", () => {
    expect(createDeliverySchema.safeParse(validDelivery).success).toBe(true);
  });

  it("rejects a delivery with no items", () => {
    const result = createDeliverySchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a zero quantity", () => {
    const result = createDeliverySchema.safeParse({
      items: [{ purchaseOrderItemId: "poitem_1", quantity: "0" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative quantity", () => {
    const result = createDeliverySchema.safeParse({
      items: [{ purchaseOrderItemId: "poitem_1", quantity: "-10" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("DELIVERY_STATUS_TRANSITIONS", () => {
  it("allows the standard forward path from EXPECTED to VERIFIED", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.EXPECTED).toContain("DELIVERED");
    expect(DELIVERY_STATUS_TRANSITIONS.DELIVERED).toContain("VERIFIED");
  });

  it("allows skipping IN_TRANSIT when goods arrive the same day they're expected", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.EXPECTED).toContain("DELIVERED");
  });

  it("treats VERIFIED as terminal", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.VERIFIED).toEqual([]);
  });

  it("allows disputing from any non-terminal status", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.EXPECTED).toContain("DISPUTED");
    expect(DELIVERY_STATUS_TRANSITIONS.IN_TRANSIT).toContain("DISPUTED");
    expect(DELIVERY_STATUS_TRANSITIONS.DELIVERED).toContain("DISPUTED");
  });

  it("allows a dispute to be resolved back to DELIVERED or VERIFIED", () => {
    expect(DELIVERY_STATUS_TRANSITIONS.DISPUTED).toEqual(
      expect.arrayContaining(["DELIVERED", "VERIFIED"]),
    );
  });
});
