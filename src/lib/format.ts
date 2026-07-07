/** minutes-from-midnight → "5:00 PM". */
export function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayShort(iso: string): string {
  return WEEKDAYS[new Date(iso + "T00:00:00Z").getUTCDay()]!;
}

export function dayNum(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDate();
}

/** Round hours to 1 decimal for display. */
export function fmtHours(h: number): string {
  return `${Math.round(h * 10) / 10}h`;
}
