const formatter = new Intl.DateTimeFormat("fr-CA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
export function dayKey(v: string | Date) {
  return (v instanceof Date ? v.toISOString() : v).slice(0, 10);
}
export function stayDates(from: string | Date, to: string | Date) {
  const a = new Date(dayKey(from) + "T00:00:00Z"),
    b = new Date(dayKey(to) + "T00:00:00Z");
  return formatter.formatRange(a, b);
}
