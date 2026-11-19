const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TotpResult {
  code: string;
  remainingSeconds: number;
  period: number;
  normalizedSecret: string;
}

/**
 * Extracts raw Base32 secret from either a plain Base32 string
 * (e.g. "JBSW Y3DP EHPK 3PXP") or an otpauth://totp/... URI.
 */
export function extractBase32Secret(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      const secretParam = url.searchParams.get('secret');
      if (secretParam) {
        return secretParam.toUpperCase().replace(/[\s=-]+/g, '');
      }
    } catch {
      // Fallback regex if URL parsing fails
      const match = trimmed.match(/[?&]secret=([A-Za-z2-7=\s]+)/i);
      if (match?.[1]) {
        return match[1].toUpperCase().replace(/[\s=-]+/g, '');
      }
    }
  }

  return trimmed.toUpperCase().replace(/[\s=-]+/g, '');
}

export function validateBase32Secret(input: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = extractBase32Secret(input);
  if (!normalized) {
    return { valid: false, normalized: '', error: 'Secret key masih kosong.' };
  }

  for (let i = 0; i < normalized.length; i++) {
    if (!BASE32_ALPHABET.includes(normalized[i])) {
      return {
        valid: false,
        normalized,
        error: `Karakter "${normalized[i]}" bukan Base32 valid (hanya A–Z dan 2–7).`,
      };
    }
  }

  if (normalized.length < 8) {
    return {
      valid: false,
      normalized,
      error: 'Secret key terlalu pendek (minimal 8 karakter Base32, umumnya 16 atau 32).',
    };
  }

  return { valid: true, normalized };
}

export function decodeBase32(base32: string): Uint8Array {
  const cleaned = extractBase32Secret(base32);
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generates an RFC 6238 compliant 6-digit TOTP code using Web Crypto HMAC-SHA1.
 */
export async function generateTotpBrowser(
  secretInput: string,
  timestampMs: number = Date.now(),
  period: number = 30,
  digits: number = 6
): Promise<TotpResult> {
  const validation = validateBase32Secret(secretInput);
  if (!validation.valid) {
    throw new Error(validation.error || 'Base32 secret tidak valid.');
  }

  const keyBytes = decodeBase32(validation.normalized);
  const epochSeconds = Math.floor(timestampMs / 1000);
  const remainingSeconds = period - (epochSeconds % period);
  const counter = Math.floor(epochSeconds / period);

  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  // Write 64-bit big-endian unsigned integer
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);

  const rawKey = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength
  ) as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otpNumber = binary % Math.pow(10, digits);
  const code = String(otpNumber).padStart(digits, '0');

  return {
    code,
    remainingSeconds,
    period,
    normalizedSecret: validation.normalized,
  };
}
