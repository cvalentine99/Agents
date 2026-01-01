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

    it("should produce valid hex encoding in encrypted output", () => {
      const originalText = "test-encoding-verification";
      const encrypted = encrypt(originalText);
      
      // Verify the output is valid hex (only contains 0-9, a-f)
      expect(encrypted).toMatch(/^[0-9a-f]+$/i);
      
      // Verify the encrypted data portion is also valid hex
      const encryptedDataStart = 32 + 32 + 32; // salt + iv + authTag in hex
      const encryptedData = encrypted.slice(encryptedDataStart);
      expect(encryptedData).toMatch(/^[0-9a-f]+$/i);
    });

    it("should use utf8 encoding for input and output", () => {
      // Test with unicode characters to verify utf8 encoding
      const originalText = "API密钥テスト🔑";
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
      // Verify the decrypted text has the same byte length when encoded as utf8
      expect(Buffer.from(decrypted, "utf8").length).toBe(Buffer.from(originalText, "utf8").length);
    });

    it("should correctly parse hex-encoded components during decryption", () => {
      const originalText = "verify-hex-parsing";
      const encrypted = encrypt(originalText);
      
      // Verify structure: salt (32 hex) + iv (32 hex) + authTag (32 hex) + data
      const saltHex = encrypted.slice(0, 32);
      const ivHex = encrypted.slice(32, 64);
      const authTagHex = encrypted.slice(64, 96);
      
      // Each component should be valid hex and correct length
      expect(saltHex.length).toBe(32);
      expect(ivHex.length).toBe(32);
      expect(authTagHex.length).toBe(32);
      
      // Verify they can be parsed as hex buffers
      expect(Buffer.from(saltHex, "hex").length).toBe(16);
      expect(Buffer.from(ivHex, "hex").length).toBe(16);
      expect(Buffer.from(authTagHex, "hex").length).toBe(16);
    });

    it("should fail decryption with tampered ciphertext", () => {
      const originalText = "tamper-test";
      const encrypted = encrypt(originalText);
      
      // Tamper with the encrypted data portion (after salt+iv+authTag)
      const tamperedEncrypted = encrypted.slice(0, 96) + "ff" + encrypted.slice(98);
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it("should fail decryption with tampered auth tag", () => {
      const originalText = "auth-tag-test";
      const encrypted = encrypt(originalText);
      
      // Tamper with the auth tag (bytes 64-96)
      const tamperedAuthTag = encrypted.slice(0, 64) + "00".repeat(16) + encrypted.slice(96);
      
      expect(() => decrypt(tamperedAuthTag)).toThrow();
    });

    it("should produce different encrypted lengths for different input lengths", () => {
      const short = encrypt("a");
      const medium = encrypt("a".repeat(50));
      const long = encrypt("a".repeat(200));
      
      // Encrypted data length should vary with input length
      // Base overhead: 32 (salt) + 32 (iv) + 32 (authTag) = 96 hex chars
      expect(short.length).toBeLessThan(medium.length);
      expect(medium.length).toBeLessThan(long.length);
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
