/**
 * Deterministic natural-language → block-event parser. Handles the common,
 * unambiguous phrasings offline ("dinner tonight 6-8", "friday 5pm to 7pm").
 * Messy/ambiguous input is where MiniMax takes over later (server-side) — this
 * pure core keeps the frequent cases instant, free, and offline.
 */

export interface BlockParseContext {
  /** The 7 ISO dates of the week being viewed (index 0 = week start). */
  weekDates: string[];
  /** "today" for resolving today/tonight/tomorrow (ISO YYYY-MM-DD). */
  todayISO: string;
}

export interface ParsedBlock {
  date: string;
  start: number; // minutes from midnight
  end: number;
  reason?: string;
}

export type ParseResult =
  | { ok: true; block: ParsedBlock }
  | { ok: false; error: string };

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
};

const DAYPART: Record<string, [number, number]> = {
  morning: [540, 720], // 9–12
  afternoon: [780, 1020], // 1–5
  evening: [1020, 1260], // 5–9
  tonight: [1020, 1260],
  night: [1140, 1320],
};

const STOPWORDS = new Set([
  "blocked", "block", "cant", "can't", "cannot", "study", "studying", "i", "im",
  "i'm", "busy", "have", "got", "a", "an", "the", "on", "at", "this", "next",
  "because", "cuz", "for", "to", "from", "of", "my", "me", "is", "will", "be",
]);

const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function parseBlock(text: string, ctx: BlockParseContext): ParseResult {
  const raw = text.trim();
  if (!raw) return { ok: false, error: "Say what to block, e.g. “dinner tonight 6–8”." };
  const lower = raw.toLowerCase().replace(/[–—]/g, "-");

  const date = resolveDate(lower, ctx);
  const time = resolveTime(lower);
  if (!time) return { ok: false, error: "I couldn't find a time — try “6–8pm” or “5pm to 7pm”." };
  if (time.end <= time.start) return { ok: false, error: "The end time is before the start." };

  const reason = extractReason(lower);
  return { ok: true, block: { date, start: time.start, end: time.end, ...(reason ? { reason } : {}) } };
}

function resolveDate(lower: string, ctx: BlockParseContext): string {
  if (/\btomorrow\b/.test(lower)) return addDaysISO(ctx.todayISO, 1);
  if (/\b(today|tonight)\b/.test(lower)) return ctx.todayISO;
  for (const [word, idx] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) {
      const match = ctx.weekDates.find(
        (d) => new Date(d + "T00:00:00Z").getUTCDay() === idx
      );
      if (match) return match;
    }
  }
  return ctx.todayISO;
}

interface TimeRange {
  start: number;
  end: number;
}

function resolveTime(lower: string): TimeRange | null {
  const range =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/.exec(
      lower
    );
  const eveningBias = /\b(tonight|evening|night)\b/.test(lower);

  if (range) {
    let [, h1, m1, ap1, h2, m2, ap2] = range;
    let sh = parseInt(h1!, 10);
    let eh = parseInt(h2!, 10);
    const sm = m1 ? parseInt(m1, 10) : 0;
    const em = m2 ? parseInt(m2, 10) : 0;

    // Propagate an explicit am/pm to the side that lacks one.
    if (ap1 && !ap2) ap2 = ap1;
    if (ap2 && !ap1) ap1 = ap2;

    sh = to24(sh, ap1, eveningBias);
    eh = to24(eh, ap2, eveningBias);
    let start = sh * 60 + sm;
    let end = eh * 60 + em;
    // If neither had am/pm and end landed before start, the end is really PM.
    if (!ap1 && !ap2 && end <= start && eh < 12) end = (eh + 12) * 60 + em;
    return { start, end };
  }

  for (const [word, [s, e]] of Object.entries(DAYPART)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return { start: s, end: e };
  }
  return null;
}

/** Convert an hour to 24h. With no am/pm: 1–7 → PM, 8–11 → AM, 12 → noon. */
function to24(h: number, ap: string | undefined, eveningBias: boolean): number {
  if (ap === "am") return h === 12 ? 0 : h;
  if (ap === "pm") return h === 12 ? 12 : h + 12;
  if (h === 12) return 12;
  if (eveningBias) return h < 12 ? h + 12 : h;
  return h >= 1 && h <= 7 ? h + 12 : h;
}

function extractReason(lower: string): string | undefined {
  const words = lower
    .replace(/\d{1,2}(?::\d{2})?\s*(am|pm)?/g, " ")
    .replace(/[-]/g, " ")
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w &&
        !STOPWORDS.has(w) &&
        !(w in WEEKDAYS) &&
        !(w in DAYPART) &&
        !["today", "tomorrow"].includes(w)
    );
  return words.length ? words.join(" ") : undefined;
}
