import crypto from "crypto";

// Use JWT_SECRET as the base for encryption key
const ENCRYPTION_KEY = process.env.JWT_SECRET || "default-key-change-in-production";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16; // Random salt per encryption
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derive a 32-byte key from the secret using a random salt
 * SECURITY: Using per-encryption random salt prevents rainbow table attacks
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
}

/**
 * Encrypt a string (API key) using AES-256-GCM with per-encryption random salt
 * Format: salt (16 bytes) + iv (16 bytes) + authTag (16 bytes) + encrypted data
 */
export function encrypt(text: string): string {
  // Generate random salt for each encryption
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt + IV + authTag + encrypted data
  return salt.toString("hex") + iv.toString("hex") + authTag.toString("hex") + encrypted;
}

/**
 * Decrypt an encrypted string back to the original API key
 * Extracts the salt used during encryption to derive the same key
 */
export function decrypt(encryptedText: string): string {
  // Extract salt, IV, authTag, and encrypted data
  const salt = Buffer.from(encryptedText.slice(0, SALT_LENGTH * 2), "hex");
  const iv = Buffer.from(encryptedText.slice(SALT_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2), "hex");
  const authTag = Buffer.from(
    encryptedText.slice(SALT_LENGTH * 2 + IV_LENGTH * 2, SALT_LENGTH * 2 + IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2), 
    "hex"
  );
  const encrypted = encryptedText.slice(SALT_LENGTH * 2 + IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);
  
  // Derive the same key using the stored salt
  const key = deriveKey(salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Get the last 4 characters of an API key for display hint
 */
export function getKeyHint(apiKey: string): string {
  if (apiKey.length < 4) return "****";
  return apiKey.slice(-4);
}

/**
 * Mask an API key for display (show first 4 and last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "****";
  return apiKey.slice(0, 4) + "..." + apiKey.slice(-4);
}
