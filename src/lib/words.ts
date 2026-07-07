const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Spell out 0..99 (e.g. 12 → "twelve", 43 → "forty-three"). */
export function numberToWords(n: number): string {
  if (n < 0) return String(n);
  if (n < 20) return ONES[n]!;
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${TENS[t]}-${ONES[o]}` : TENS[t]!;
  }
  return String(n);
}

/** "twelve days away" / "tomorrow" / "301 days away" — editorial countdown copy. */
export function daysAway(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  const n = days <= 99 ? numberToWords(days) : String(days);
  return `${n} days away`;
}
