import { describe, it, expect } from "vitest";
import { validatePassword, validateEmail } from "./password";

describe("validatePassword", () => {
  describe("valid passwords", () => {
    it("should accept password with all requirements", () => {
      const result = validatePassword("Test123!");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept password with all allowed special characters", () => {
      const passwords = [
        "Test123@",
        "Test123$",
        "Test123!",
        "Test123%",
        "Test123*",
        "Test123?",
        "Test123&",
        "Test123#",
      ];

      passwords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      });
    });

    it("should accept longer passwords", () => {
      const result = validatePassword("VeryLongPassword123!WithManyCharacters");
      expect(result.isValid).toBe(true);
    });

    it("should accept exactly 8 characters", () => {
      const result = validatePassword("Test123!");
      expect(result.isValid).toBe(true);
    });
  });

  describe("invalid passwords", () => {
    it("should reject empty password", () => {
      const result = validatePassword("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Hasło jest wymagane");
    });

    it("should reject password shorter than 8 characters", () => {
      const result = validatePassword("Test12!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Hasło musi mieć co najmniej 8 znaków");
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePassword("TEST123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Hasło musi zawierać co najmniej jedną małą literę"
      );
    });

    it("should reject password without uppercase letter", () => {
      const result = validatePassword("test123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Hasło musi zawierać co najmniej jedną wielką literę"
      );
    });

    it("should reject password without digit", () => {
      const result = validatePassword("TestTest!");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Hasło musi zawierać co najmniej jedną cyfrę");
    });

    it("should reject password without special character", () => {
      const result = validatePassword("Test1234");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Hasło musi zawierać co najmniej jeden znak specjalny: @$!%*?&#"
      );
    });

    it("should reject password with disallowed special characters", () => {
      const passwords = [
        "Test123^", // caret
        "Test123~", // tilde
        "Test123+", // plus
        "Test123=", // equals
        "Test123.", // dot
        "Test123,", // comma
      ];

      passwords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("niedozwolone znaki");
      });
    });

    it("should reject password with spaces", () => {
      const result = validatePassword("Test 123!");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("niedozwolone znaki");
    });
  });
});

describe("validateEmail", () => {
  describe("valid emails", () => {
    it("should accept standard email format", () => {
      const result = validateEmail("user@example.com");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept email with subdomain", () => {
      const result = validateEmail("user@mail.example.com");
      expect(result.isValid).toBe(true);
    });

    it("should accept email with plus sign", () => {
      const result = validateEmail("user+tag@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should accept email with dots", () => {
      const result = validateEmail("first.last@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should accept email with numbers", () => {
      const result = validateEmail("user123@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should handle email with leading/trailing spaces (trim)", () => {
      const result = validateEmail("  user@example.com  ");
      expect(result.isValid).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("should reject empty email", () => {
      const result = validateEmail("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Email jest wymagany");
    });

    it("should reject email without @", () => {
      const result = validateEmail("userexample.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email without domain", () => {
      const result = validateEmail("user@");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email without TLD", () => {
      const result = validateEmail("user@example");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email with multiple @", () => {
      const result = validateEmail("user@@example.com");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email longer than 255 characters", () => {
      const longEmail = "a".repeat(250) + "@test.com";
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Email może mieć maksymalnie 255 znaków");
    });

    it("should reject email with only spaces", () => {
      const result = validateEmail("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Nieprawidłowy format adresu email");
    });
  });
});
