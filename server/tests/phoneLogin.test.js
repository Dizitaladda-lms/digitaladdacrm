import { beforeEach, describe, expect, it, vi } from "vitest";
import { validationResult } from "express-validator";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("../config/db.js", () => ({
  default: {
    query: mockQuery,
  },
}));

import {
  normalizeLoginPhone,
  findUserByEmailWithPasswordRepository,
} from "../repositories/authRepository.js";
import { loginValidator } from "../validators/authValidator.js";

const runValidators = async (body) => {
  const req = { body };
  for (const validator of loginValidator) {
    await validator.run(req);
  }
  return validationResult(req);
};

describe("Phone Number Login Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeLoginPhone", () => {
    it("normalizes 10-digit mobile numbers and +91 / 0 prefixed numbers to 10 digits", () => {
      expect(normalizeLoginPhone("9876543210")).toBe("9876543210");
      expect(normalizeLoginPhone("+91 98765 43210")).toBe("9876543210");
      expect(normalizeLoginPhone("+91-98765-43210")).toBe("9876543210");
      expect(normalizeLoginPhone("919876543210")).toBe("9876543210");
      expect(normalizeLoginPhone("09876543210")).toBe("9876543210");
    });

    it("returns null for email addresses or invalid short strings", () => {
      expect(normalizeLoginPhone("employee9876543210@dizitaladda.com")).toBeNull();
      expect(normalizeLoginPhone("12345")).toBeNull();
      expect(normalizeLoginPhone("")).toBeNull();
    });
  });

  describe("findUserByEmailWithPasswordRepository", () => {
    it("passes normalized 10-digit phone number when employee logs in with mobile number", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            full_name: "Aman Verma",
            email: "aman@dizitaladda.com",
            mobile: "+91 9876543210",
            role: "EMPLOYEE",
          },
        ],
      });

      const user = await findUserByEmailWithPasswordRepository("+91 98765 43210");

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain("RIGHT(REGEXP_REPLACE(e.mobile");
      expect(params).toEqual(["+91 98765 43210", "9876543210"]);
      expect(user.id).toBe(42);
      expect(user.mobile).toBe("+91 9876543210");
    });

    it("passes null normalizedPhone when logging in with an email address", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            full_name: "Aman Verma",
            email: "aman@dizitaladda.com",
            role: "EMPLOYEE",
          },
        ],
      });

      await findUserByEmailWithPasswordRepository("aman@dizitaladda.com");

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual(["aman@dizitaladda.com", null]);
    });
  });

  describe("loginValidator", () => {
    it("accepts phone number in email, phone, or identifier field", async () => {
      const resEmailField = await runValidators({
        email: "9876543210",
        password: "Password@123",
      });
      expect(resEmailField.isEmpty()).toBe(true);

      const resPhoneField = await runValidators({
        phone: "+91 9876543210",
        password: "Password@123",
      });
      expect(resPhoneField.isEmpty()).toBe(true);

      const resIdentifierField = await runValidators({
        identifier: "9876543210",
        password: "Password@123",
      });
      expect(resIdentifierField.isEmpty()).toBe(true);
    });

    it("rejects when neither email nor phone number is provided", async () => {
      const res = await runValidators({
        email: "   ",
        password: "Password@123",
      });
      expect(res.isEmpty()).toBe(false);
    });
  });
});
