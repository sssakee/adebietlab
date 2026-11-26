import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(secret, salt, 32).toString("hex")}`;
}

export function verifySecret(secret: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(secret, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 6-character class code without look-alike characters (0/O, 1/I). */
export function joinCode(): string {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6), (b) => abc[b % abc.length]).join("");
}
