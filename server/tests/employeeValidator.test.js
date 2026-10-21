import { describe, expect, it } from "vitest";
import {
  validateCreateEmployee,
  validateUpdateEmployee,
} from "../validators/employee.validator.js";

const runValidator = (validator, body) => new Promise((resolve) => {
  const req = { body: { ...body } };
  validator(req, {}, (error) => resolve({ body: req.body, error }));
});

describe("employee multi-department validation", () => {
  it("preserves managed department IDs during employee creation", async () => {
    const result = await runValidator(validateCreateEmployee, {
      full_name: "Multi Department Lead",
      email: "multi.lead@example.com",
      mobile: "9876543210",
      department_id: 7,
      managed_department_ids: [8, 9],
      designation: "Team Lead",
      role: "TL",
    });

    expect(result.error).toBeUndefined();
    expect(result.body.managed_department_ids).toEqual([8, 9]);
  });

  it("preserves managed department IDs during employee updates", async () => {
    const result = await runValidator(validateUpdateEmployee, {
      managed_department_ids: [8, 9],
    });

    expect(result.error).toBeUndefined();
    expect(result.body.managed_department_ids).toEqual([8, 9]);
  });
});
