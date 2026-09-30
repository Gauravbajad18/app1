/**
 * Checksum Algorithms for Deterministic Data Validation:
 * - Luhn Algorithm (Credit Cards)
 * - Verhoeff Algorithm (Aadhaar 12-digit UID)
 * - IBAN Mod-97 Checksum
 */

// ============================================================================
// 1. Luhn Checksum (ISO/IEC 7812)
// ============================================================================
export function luhnCheck(value: string): boolean {
  const sanitized = value.replace(/[\s-]/g, "");
  if (!/^\d{12,19}$/.test(sanitized)) {
    return false;
  }

  let sum = 0;
  let alternate = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let n = parseInt(sanitized.charAt(i), 10);

    if (alternate) {
      n *= 2;
      if (n > 9) {
        n -= 9;
      }
    }

    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

// ============================================================================
// 2. Verhoeff Algorithm (UIDAI Aadhaar Checksum)
// ============================================================================
// Multiplication table (d)
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

// Permutation table (p)
const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

// Inverse table (inv)
const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffCheck(numStr: string): boolean {
  const sanitized = numStr.replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(sanitized)) {
    return false;
  }

  // First digit cannot be 0 or 1 in standard Aadhaar issuance
  if (sanitized[0] === "0" || sanitized[0] === "1") {
    return false;
  }

  let c = 0;
  const digits = sanitized.split("").reverse().map(Number);

  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }

  return c === 0;
}

// Generate valid Verhoeff checksum digit (useful for test cases/seeding)
export function generateVerhoeffChecksum(numStr: string): string {
  const sanitized = numStr.replace(/[\s-]/g, "");
  let c = 0;
  const digits = sanitized.split("").reverse().map(Number);

  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
  }

  return VERHOEFF_INV[c].toString();
}

// ============================================================================
// 3. IBAN Mod-97 Checksum (ISO 7064)
// ============================================================================
export function ibanCheck(ibanStr: string): boolean {
  const sanitized = ibanStr.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(sanitized)) {
    return false;
  }

  // Move first 4 characters to the end
  const rearranged = sanitized.slice(4) + sanitized.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numeric = "";
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numeric += (code - 55).toString();
    } else {
      numeric += rearranged.charAt(i);
    }
  }

  // Perform large integer mod 97 in chunks
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}
