import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string) {
  const [version, salt, stored] = hash.split("$");
  if (version !== "scrypt-v1" || !salt || !stored) return false;
  const candidate = await derive(password, salt);
  const expected = Buffer.from(stored, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// Mantiene el trabajo de hashing aunque el correo no exista.
export const dummyHash = `scrypt-v1$${"0".repeat(32)}$${"0".repeat(128)}`;
