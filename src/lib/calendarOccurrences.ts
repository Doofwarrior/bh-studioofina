import type { CalendarEntry } from "./calendar";
import { dayNumber, offsetDay } from "./recurrence";
const dayMs = 86400000;
export interface DateRange {
  from: string;
  through: string;
}
function* slots(entry: CalendarEntry, lo: number, hi: number) {
  const anchor = dayNumber(entry.startsAt.slice(0, 10)),
    rule = entry.recurrence;
  if (!rule) {
    yield { ordinal: 0, day: anchor };
    return;
  }
  const regular = rule.frequency === "weekly" || rule.frequency === "daily",
    step = rule.interval * (rule.frequency === "weekly" ? 7 : 1);
  const first = regular ? Math.max(0, Math.ceil((lo - anchor) / step)) : 0;
  const last = rule.until ? Math.min(hi, dayNumber(rule.until)) : hi;
  let count = first;
  for (let n = first; !rule.count || count < rule.count; n++) {
    let day = anchor + n * step;
    if (!regular) {
      const start = new Date(anchor * dayMs),
        date = new Date(start);
      date.setUTCMonth(
        start.getUTCMonth() + n * step * (rule.frequency === "yearly" ? 12 : 1),
      );
      day = +date / dayMs;
      if (!Number.isFinite(day) || day > last) break;
      if (date.getUTCDate() !== start.getUTCDate()) continue;
    }
    if (day > last) break;
    count++;
    if (day >= lo) yield { ordinal: n, day };
  }
}
export function includesOriginalSlot(entry: CalendarEntry, slot: string) {
  const day = dayNumber(slot);
  return !slots(entry, day, day).next().done;
}
function timing(
  entry: Pick<CalendarEntry, "startsAt" | "endsAt" | "allDay">,
  shift: number,
) {
  if (!entry.allDay)
    return {
      start: Date.parse(entry.startsAt) + shift * dayMs,
      end: Date.parse(entry.endsAt) + shift * dayMs,
      allDay: false,
    };
  const first = entry.startsAt.slice(0, 10),
    last = entry.endsAt.slice(0, 10);
  return {
    start: +new Date(offsetDay(first, shift) + "T00:00"),
    end: +new Date(
      offsetDay(last > first ? last : offsetDay(first, 1), shift) + "T00:00",
    ),
    allDay: true,
  };
}
export function* calendarInstances(entry: CalendarEntry, range?: DateRange) {
  const anchor = dayNumber(entry.startsAt.slice(0, 10));
  const exceptions = entry.recurrence?.exceptions ?? {};
  const instance = (ordinal: number, day: number) => {
    const slot = new Date(day * dayMs).toISOString().slice(0, 10),
      ex = exceptions[slot];
    const times =
      ex && "startsAt" in ex
        ? timing({ ...entry, ...ex }, 0)
        : timing(entry, day - anchor);
    return { ...times, slot, ordinal, cancelled: !!(ex && "cancelled" in ex) };
  };
  if (!range) {
    yield instance(0, anchor);
    return;
  }
  const from = +new Date(range.from + "T00:00"),
    end = +new Date(offsetDay(range.through, 1) + "T00:00");
  const span = Math.ceil(
    (Date.parse(entry.endsAt) - Date.parse(entry.startsAt)) / dayMs,
  );
  // Include overnight overlaps and offset differences across the date line.
  const lo = dayNumber(range.from) - span - 2,
    hi = dayNumber(range.through) + 2;
  const overlaps = (i: { start: number; end: number }) =>
    i.start < end && i.end > from;
  for (const { ordinal, day } of slots(entry, lo, hi)) {
    const i = instance(ordinal, day);
    if (overlaps(i)) yield i;
  }
  // An override may move into this window from a distant original slot.
  for (const [slot, ex] of Object.entries(exceptions)) {
    const original = dayNumber(slot);
    if (
      (original >= lo && original <= hi) ||
      !("startsAt" in ex) ||
      !overlaps(timing({ ...entry, ...ex }, 0))
    )
      continue;
    for (const { ordinal, day } of slots(entry, original, original))
      yield instance(ordinal, day);
  }
}
