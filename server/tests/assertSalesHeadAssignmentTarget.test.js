import { describe, expect, it } from "vitest";
import assertSalesHeadAssignmentTarget from "../utils/assertSalesHeadAssignmentTarget.js";

describe("Sales Head assignment target policy", () => {
  it("allows assignment to an active counsellor", () => {
    expect(() =>
      assertSalesHeadAssignmentTarget("SALES_HEAD", {
        role: "COUNSELLOR",
        status: "ACTIVE",
      })
    ).not.toThrow();
  });

  it.each([
    { role: "EMPLOYEE", status: "ACTIVE" },
    { role: "COUNSELLOR", status: "INACTIVE" },
  ])("rejects a non-assignable employee target", (employee) => {
    expect(() => assertSalesHeadAssignmentTarget("SALES_HEAD", employee)).toThrow(
      "Sales Heads can assign leads only to active counsellors."
    );
  });

  it("does not change assignment rules for other roles", () => {
    expect(() =>
      assertSalesHeadAssignmentTarget("MANAGER", {
        role: "EMPLOYEE",
        status: "INACTIVE",
      })
    ).not.toThrow();
  });
});
