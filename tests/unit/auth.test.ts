import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "../../shared/src/schemas/auth";

describe("Auth Validation Schemas", () => {
  describe("loginSchema", () => {
    it("should validate valid login data", () => {
      const data = { email: "test@example.com", password: "password123" };
      expect(loginSchema.parse(data)).toEqual(data);
    });

    it("should fail on invalid email", () => {
      const data = { email: "invalid-email", password: "password123" };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe("registerSchema", () => {
    it("should validate valid registration data", () => {
      const data = { 
        email: "test@example.com", 
        password: "password123", 
        name: "Test User",
        role: "retail_buyer"
      };
      expect(registerSchema.parse(data)).toEqual(data);
    });

    it("should fail on missing role", () => {
      const data = { 
        email: "test@example.com", 
        password: "password123", 
        name: "Test User"
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });
  });
});
