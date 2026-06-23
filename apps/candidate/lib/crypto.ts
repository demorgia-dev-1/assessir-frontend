/**
 * Simple symmetric encryption/decryption for passing batch data in URL params.
 * Uses base64 + XOR obfuscation — not cryptographic security, but prevents
 * casual inspection and keeps the URL param tamper-resistant.
 */

const CRYPTO_KEY = "assessir-candidate-2026";

function xorCipher(input: string, key: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(
      input.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * Encrypt a JSON-serialisable value into a URL-safe base64 string.
 */
export function encryptData<T>(data: T): string {
  try {
    const json = JSON.stringify(data);
    const ciphered = xorCipher(json, CRYPTO_KEY);
    // Convert to base64, then make URL-safe
    const base64 = btoa(
      encodeURIComponent(ciphered).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

/**
 * Decrypt a URL-safe base64 string back to the original value.
 */
export function decryptData<T>(encrypted: string): T | null {
  try {
    // Restore standard base64
    let base64 = encrypted.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);

    const decoded = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const json = xorCipher(decoded, CRYPTO_KEY);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
