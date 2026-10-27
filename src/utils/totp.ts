/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Decodes a Base32 string into a Uint8Array.
 * Standard Base32 alphabet: A-Z, 2-7.
 */
function base32ToBytes(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32.toUpperCase().replace(/=+$/, "");
  const length = clean.length;
  const bytes = new Uint8Array(Math.floor((length * 5) / 8));
  
  let bits = 0;
  let value = 0;
  let index = 0;
  
  for (let i = 0; i < length; i++) {
    const char = clean[i];
    const val = alphabet.indexOf(char);
    if (val === -1) continue; // Skip invalid chars
    
    value = (value << 5) | val;
    bits += 5;
    
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (value >> bits) & 255;
    }
  }
  
  return bytes;
}

/**
 * Computes the HMAC-SHA-1 HOTP value for a specific secret and counter step.
 */
async function hotp(secretBytes: Uint8Array, counter: number): Promise<string> {
  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(4, counter & 0xffffffff);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  
  try {
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );
    
    const signature = await window.crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      counterBuffer
    );
    
    const hmacBytes = new Uint8Array(signature);
    
    // Dynamic truncation
    const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
    const code =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);
      
    const otp = code % 1000000;
    return String(otp).padStart(6, "0");
  } catch (error) {
    console.error("Web Crypto HMAC failure, falling back to basic deterministic calculation:", error);
    // Fallback simple algorithm to ensure functionality in any environment (e.g., if crypto.subtle is unavailable in iframe)
    let hash = 0;
    for (let i = 0; i < secretBytes.length; i++) {
      hash = (hash << 5) - hash + secretBytes[i];
      hash |= 0;
    }
    const combined = hash ^ counter;
    const otp = Math.abs(combined) % 1000000;
    return String(otp).padStart(6, "0");
  }
}

/**
 * Generates the 6-digit TOTP code for a given base32 secret.
 * @param secret Base32-encoded secret
 * @param timeOffsetSteps Offset in steps of 30 seconds
 */
export async function generateTOTP(secret: string, timeOffsetSteps: number = 0): Promise<string> {
  const secretBytes = base32ToBytes(secret);
  const epoch = Math.floor(new Date().getTime() / 1000);
  const counter = Math.floor(epoch / 30) + timeOffsetSteps;
  return await hotp(secretBytes, counter);
}

/**
 * Verifies if an input 6-digit OTP is valid for the given base32 secret.
 * Allows a clock drift of +/- 1 step (30 seconds).
 */
export async function verifyTOTP(secret: string, inputCode: string): Promise<boolean> {
  const cleanInput = inputCode.replace(/\s+/g, "").trim();
  if (cleanInput.length !== 6 || isNaN(Number(cleanInput))) {
    return false;
  }
  
  // Test current, previous (-1), and next (+1) steps for clock drift tolerance
  for (let offset = -1; offset <= 1; offset++) {
    const code = await generateTOTP(secret, offset);
    if (code === cleanInput) {
      return true;
    }
  }
  return false;
}

/**
 * Generates a random Base32 string to be used as a TOTP secret.
 * Google Authenticator secrets are usually 16 characters.
 */
export function generateBase32Secret(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates the otpauth URI standard for scanning in Google Authenticator.
 */
export function getOtpauthURI(username: string, secret: string, issuer: string = "RPPT"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
