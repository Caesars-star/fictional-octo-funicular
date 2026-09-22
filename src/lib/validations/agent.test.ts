import { describe, expect, it } from "vitest";
import { LEAD_STATUS_TRANSITIONS, createLeadSchema, updateAgentSchema } from "./agent";

describe("createLeadSchema", () => {
  it("accepts a minimal valid lead", () => {
    const result = createLeadSchema.safeParse({
      type: "DEVELOPER",
      organizationName: "Uzima Homes Ltd",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank organization name", () => {
    const result = createLeadSchema.safeParse({ type: "DEVELOPER", organizationName: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid lead type", () => {
    const result = createLeadSchema.safeParse({
      type: "NOT_A_TYPE",
      organizationName: "Uzima Homes Ltd",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed contact email", () => {
    const result = createLeadSchema.safeParse({
      type: "DEVELOPER",
      organizationName: "Uzima Homes Ltd",
      contactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an empty contact email", () => {
    const result = createLeadSchema.safeParse({
      type: "DEVELOPER",
      organizationName: "Uzima Homes Ltd",
      contactEmail: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateAgentSchema", () => {
  it("accepts an empty update", () => {
    expect(updateAgentSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a valid status and commission rate", () => {
    const result = updateAgentSchema.safeParse({ status: "SUSPENDED", commissionRate: "7.5" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status", () => {
    const result = updateAgentSchema.safeParse({ status: "ON_LEAVE" });
    expect(result.success).toBe(false);
  });
});

describe("LEAD_STATUS_TRANSITIONS", () => {
  it("allows the standard forward path from NEW to CONVERTED", () => {
    expect(LEAD_STATUS_TRANSITIONS.NEW).toContain("CONTACTED");
    expect(LEAD_STATUS_TRANSITIONS.CONTACTED).toContain("QUALIFIED");
    expect(LEAD_STATUS_TRANSITIONS.QUALIFIED).toContain("CONVERTED");
  });

  it("allows a lead to be marked LOST from any non-terminal status", () => {
    expect(LEAD_STATUS_TRANSITIONS.NEW).toContain("LOST");
    expect(LEAD_STATUS_TRANSITIONS.CONTACTED).toContain("LOST");
    expect(LEAD_STATUS_TRANSITIONS.QUALIFIED).toContain("LOST");
  });

  it("treats CONVERTED and LOST as terminal", () => {
    expect(LEAD_STATUS_TRANSITIONS.CONVERTED).toEqual([]);
    expect(LEAD_STATUS_TRANSITIONS.LOST).toEqual([]);
  });

  it("does not allow skipping straight from NEW to CONVERTED", () => {
    expect(LEAD_STATUS_TRANSITIONS.NEW).not.toContain("CONVERTED");
    expect(LEAD_STATUS_TRANSITIONS.NEW).not.toContain("QUALIFIED");
  });
});
