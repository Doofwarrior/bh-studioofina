// Slots are civil dates. UTC arithmetic here avoids DST-dependent day lengths;
// Calendar interprets the separate optional time in the viewer's local timezone.
export interface RepeatRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  weekdays?: number[];
  until?: string;
}
export interface SeriesSegment {
  from: string;
  anchor?: string;
  deadlineOffset?: number;
  rule: RepeatRule;
  title: string;
  time: string;
  links: string[];
}
export interface Occurrence {
  seriesId: string;
  slot: string;
  overridden?: boolean;
  removed?: boolean;
  retired?: boolean;
}
const dayMs = 86400000;
export function dayNumber(day: string) {
  const date = new Date(day + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(+date) ||
    date.toISOString().slice(0, 10) !== day
  )
    throw new Error("Invalid recurrence date.");
  return +date / dayMs;
}
export function offsetDay(day: string, by: number) {
  return new Date((dayNumber(day) + by) * dayMs).toISOString().slice(0, 10);
}
export function validateSegment(segment: SeriesSegment) {
  const { rule, from, time } = segment;
  dayNumber(from);
  if (segment.anchor) dayNumber(segment.anchor);
  if (!Number.isSafeInteger(segment.deadlineOffset ?? 0))
    throw new Error("Enter a whole number of days for the deadline offset.");
  if (
    !Array.isArray(segment.links) ||
    segment.links.some((link) => typeof link !== "string")
  )
    throw new Error("Invalid series references.");
  if (
    !["daily", "weekly", "monthly"].includes(rule.frequency) ||
    !Number.isSafeInteger(rule.interval) ||
    rule.interval < 1
  )
    throw new Error("Enter a positive recurrence interval.");
  if (rule.until && dayNumber(rule.until) < dayNumber(from))
    throw new Error("End date precedes the first slot.");
  if (rule.weekdays?.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    throw new Error("Invalid weekday.");
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Invalid local deadline time.");
  if (!segment.title.trim()) throw new Error("Enter a title.");
}
export function matchesSlot(start: string, rule: RepeatRule, day: string) {
  if (day < start || (rule.until && day > rule.until)) return false;
  if (day === start) return true;
  const anchor = new Date(dayNumber(start) * dayMs),
    date = new Date(dayNumber(day) * dayMs);
  const distance = (+date - +anchor) / dayMs;
  if (rule.frequency === "daily") return distance % rule.interval === 0;
  if (rule.frequency === "weekly") {
    const weeks = Math.floor((distance + anchor.getUTCDay()) / 7);
    const days = rule.weekdays?.length ? rule.weekdays : [anchor.getUTCDay()];
    return weeks % rule.interval === 0 && days.includes(date.getUTCDay());
  }
  const months =
    (date.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    date.getUTCMonth() -
    anchor.getUTCMonth();
  const last = new Date(+date);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return (
    months % rule.interval === 0 &&
    date.getUTCDate() === Math.min(anchor.getUTCDate(), last.getUTCDate())
  );
}
export function slots(
  start: string,
  rule: RepeatRule,
  from: string,
  to: string,
) {
  const length = dayNumber(to) - dayNumber(from) + 1;
  if (length < 1 || length > 62)
    throw new Error("Recurrence range must be 1–62 days.");
  const result: string[] = [];
  for (let i = 0; i < length; i++) {
    const day = offsetDay(from, i);
    if (matchesSlot(start, rule, day)) result.push(day);
  }
  return result;
}
