import { describe, expect, it } from "vitest";
import { MILESTONE_STATUS_TRANSITIONS, createMilestoneSchema } from "./milestone";

describe("createMilestoneSchema", () => {
  it("accepts a minimal valid milestone", () => {
    const result = createMilestoneSchema.safeParse({ name: "Foundation Complete" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = createMilestoneSchema.safeParse({ name: "  " });
    expect(result.success).toBe(false);
  });

  it("accepts a percentage of exactly 0 and exactly 100", () => {
    expect(createMilestoneSchema.safeParse({ name: "X", percentage: 0 }).success).toBe(true);
    expect(createMilestoneSchema.safeParse({ name: "X", percentage: 100 }).success).toBe(true);
  });

  it("rejects a percentage above 100", () => {
    const result = createMilestoneSchema.safeParse({ name: "X", percentage: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects a negative percentage", () => {
    const result = createMilestoneSchema.safeParse({ name: "X", percentage: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects a fractional percentage", () => {
    const result = createMilestoneSchema.safeParse({ name: "X", percentage: 12.5 });
    expect(result.success).toBe(false);
  });
});

describe("MILESTONE_STATUS_TRANSITIONS", () => {
  it("allows the standard forward path from PLANNED to VERIFIED", () => {
    expect(MILESTONE_STATUS_TRANSITIONS.PLANNED).toContain("IN_PROGRESS");
    expect(MILESTONE_STATUS_TRANSITIONS.IN_PROGRESS).toContain("COMPLETED");
    expect(MILESTONE_STATUS_TRANSITIONS.COMPLETED).toContain("VERIFIED");
  });

  it("allows reopening a COMPLETED milestone if verification fails", () => {
    expect(MILESTONE_STATUS_TRANSITIONS.COMPLETED).toContain("IN_PROGRESS");
  });

  it("treats VERIFIED and CANCELLED as terminal", () => {
    expect(MILESTONE_STATUS_TRANSITIONS.VERIFIED).toEqual([]);
    expect(MILESTONE_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it("allows a delayed milestone to resume progress or be cancelled", () => {
    expect(MILESTONE_STATUS_TRANSITIONS.DELAYED).toEqual(
      expect.arrayContaining(["IN_PROGRESS", "CANCELLED"]),
    );
  });

  it("does not allow skipping straight from PLANNED to VERIFIED", () => {
    expect(MILESTONE_STATUS_TRANSITIONS.PLANNED).not.toContain("VERIFIED");
    expect(MILESTONE_STATUS_TRANSITIONS.PLANNED).not.toContain("COMPLETED");
  });
});
