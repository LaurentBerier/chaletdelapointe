/** Treat all dates as plain ISO YYYY-MM-DD; no timezone math. */
export function toIsoDate(input: string | Date): string {
  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    return new Date(input).toISOString().slice(0, 10);
  }
  return input.toISOString().slice(0, 10);
}

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Inclusive list of nights between start (inclusive) and end (exclusive). */
export function eachNight(startIso: string, endIso: string): string[] {
  const start = parseDate(startIso);
  const end = parseDate(endIso);
  const nights: string[] = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    nights.push(d.toISOString().slice(0, 10));
  }
  return nights;
}

export function diffNights(startIso: string, endIso: string): number {
  const ms = parseDate(endIso).getTime() - parseDate(startIso).getTime();
  return Math.round(ms / 86_400_000);
}
