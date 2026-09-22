import { describe, expect, it } from "vitest";
import { CONTRACT_STATUS_TRANSITIONS, addContractPartySchema, createContractSchema } from "./contract";

describe("createContractSchema", () => {
  it("accepts a minimal valid contract with no parties yet", () => {
    const result = createContractSchema.safeParse({
      title: "General Contractor Agreement",
      contractType: "CONSTRUCTION",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parties).toEqual([]);
  });

  it("rejects a blank title", () => {
    const result = createContractSchema.safeParse({ title: "  ", contractType: "CONSTRUCTION" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid contract type", () => {
    const result = createContractSchema.safeParse({ title: "X", contractType: "NOT_A_TYPE" });
    expect(result.success).toBe(false);
  });

  it("accepts initial parties with roles", () => {
    const result = createContractSchema.safeParse({
      title: "Supply Agreement",
      contractType: "SUPPLY",
      parties: [{ organizationId: "org_1", role: "SUPPLIER" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("addContractPartySchema", () => {
  it("rejects an invalid role", () => {
    const result = addContractPartySchema.safeParse({ organizationId: "org_1", role: "OWNER" });
    expect(result.success).toBe(false);
  });
});

describe("CONTRACT_STATUS_TRANSITIONS", () => {
  it("allows DRAFT to move to ACTIVE or CANCELLED", () => {
    expect(CONTRACT_STATUS_TRANSITIONS.DRAFT).toEqual(
      expect.arrayContaining(["ACTIVE", "CANCELLED"]),
    );
  });

  it("allows ACTIVE to move to COMPLETED or TERMINATED, but not back to DRAFT", () => {
    expect(CONTRACT_STATUS_TRANSITIONS.ACTIVE).toEqual(
      expect.arrayContaining(["COMPLETED", "TERMINATED"]),
    );
    expect(CONTRACT_STATUS_TRANSITIONS.ACTIVE).not.toContain("DRAFT");
  });

  it("treats COMPLETED, TERMINATED and CANCELLED as terminal", () => {
    expect(CONTRACT_STATUS_TRANSITIONS.COMPLETED).toEqual([]);
    expect(CONTRACT_STATUS_TRANSITIONS.TERMINATED).toEqual([]);
    expect(CONTRACT_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });
});
