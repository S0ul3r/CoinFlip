/** 64-bit difference hash (dHash) helpers — hex string, 16 chars */

export function gray9x8ToDHashHex(gray: number[]): string {
  if (gray.length !== 72) throw new Error('dHash expects 9×8 grayscale samples');
  let bits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = gray[y * 9 + x]!;
      const right = gray[y * 9 + x + 1]!;
      bits += left < right ? '1' : '0';
    }
  }
  return bitsToHex(bits);
}

function bitsToHex(bits: string): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Downsample RGBA buffer to 9×8 grayscale (luminance). */
export function rgbaToGray9x8(data: Uint8Array, width: number, height: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      const sx = Math.min(width - 1, Math.floor((x * width) / 9));
      const sy = Math.min(height - 1, Math.floor((y * height) / 8));
      const i = (sy * width + sx) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      out.push(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  return out;
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    dist += popcount4(xor);
  }
  return dist;
}

function popcount4(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}

/** Map Hamming distance (0–64) to a 0–50 visual score. */
export function visualScoreFromDistance(distance: number): number {
  return Math.max(0, Math.round(50 - distance * 0.85));
}
