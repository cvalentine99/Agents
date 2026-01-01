import { describe, it, expect } from "vitest";
import { encrypt, decrypt, getKeyHint, maskApiKey } from "./crypto";

describe("Crypto Module", () => {
  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const originalText = "sk-test-api-key-12345";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it("should produce different ciphertexts for same plaintext (random salt)", () => {
      const originalText = "sk-test-api-key-12345";
      const encrypted1 = encrypt(originalText);
      const encrypted2 = encrypt(originalText);
      
      // Due to random salt and IV, same plaintext should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same original text
      expect(decrypt(encrypted1)).toBe(originalText);
      expect(decrypt(encrypted2)).toBe(originalText);
    });

    it("should include salt in the encrypted output format", () => {
      const originalText = "test-key";
      const encrypted = encrypt(originalText);
      
      // Format: salt (32 hex) + iv (32 hex) + authTag (32 hex) + encrypted data
      // Minimum length should be 96 hex chars (48 bytes) + encrypted data
      expect(encrypted.length).toBeGreaterThan(96);
    });

    it("should handle empty strings", () => {
      const originalText = "";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it("should handle long API keys", () => {
      const originalText = "sk-" + "a".repeat(100);
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it("should handle special characters in API keys", () => {
      const originalText = "sk-test_key-with/special+chars=123";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });
  });

  describe("getKeyHint", () => {
    it("should return last 4 characters of API key", () => {
      expect(getKeyHint("sk-test-api-key-12345")).toBe("2345");
    });

    it("should return **** for keys shorter than 4 characters", () => {
      expect(getKeyHint("abc")).toBe("****");
      expect(getKeyHint("ab")).toBe("****");
      expect(getKeyHint("a")).toBe("****");
    });

    it("should return last 4 chars for exactly 4 character key", () => {
      expect(getKeyHint("abcd")).toBe("abcd");
    });
  });

  describe("maskApiKey", () => {
    it("should mask middle of API key", () => {
      expect(maskApiKey("sk-test-api-key-12345")).toBe("sk-t...2345");
    });

    it("should return **** for keys 8 characters or shorter", () => {
      expect(maskApiKey("12345678")).toBe("****");
      expect(maskApiKey("1234567")).toBe("****");
      expect(maskApiKey("short")).toBe("****");
    });

    it("should show first 4 and last 4 for longer keys", () => {
      expect(maskApiKey("123456789")).toBe("1234...6789");
    });
  });
});
