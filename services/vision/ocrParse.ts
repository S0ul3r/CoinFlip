export type OcrCoinFields = {
  year: number | null;
  denomination: number | null;
  rawText: string;
};

const YEAR_RE = /\b(19[5-9]\d|20[0-3]\d)\b/;
const DENOM_RE =
  /\b(1|2|5|10|20|25|50|100|200|500|1000)\s*(?:ZŁ|ZL|ZŁOTYCH|ZLOTYCH|PLN)\b/i;

/** Extract year and PLN denomination from OCR text on a coin photo. */
export function parseCoinFieldsFromOcrText(text: string): OcrCoinFields {
  const rawText = text.replace(/\s+/g, ' ').trim();
  const yearMatch = rawText.match(YEAR_RE);
  const denomMatch = rawText.match(DENOM_RE);

  return {
    year: yearMatch ? Number(yearMatch[1]) : null,
    denomination: denomMatch ? Number(denomMatch[1]) : null,
    rawText,
  };
}
