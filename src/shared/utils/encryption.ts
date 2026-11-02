import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function toKeyBuffer(key: string): Buffer {
  const buffer = Buffer.from(key, "base64");

  if (buffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a base64 encoded 32 byte key");
  }

  return buffer;
}

export function encrypt(plainText: string, key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, toKeyBuffer(key), iv);
  const cipherText = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, cipherText].map((part) => part.toString("base64url")).join(".");
}

export function decrypt(payload: string, key: string): string {
  const [iv, authTag, cipherText] = payload.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(ALGORITHM, toKeyBuffer(key), iv);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8");
}
