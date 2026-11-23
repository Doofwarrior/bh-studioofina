export interface TaskReminder {
  id: string;
  sessionId?: string;
  minutes: number;
  enabled: boolean;
  desktop: boolean;
}
export function reminderInstant(anchor: string, minutes: number) {
  // Date-only deadlines begin at local midnight, as in Calendar.
  return (
    new Date(anchor.includes("T") ? anchor : anchor + "T00:00").getTime() -
    minutes * 60000
  );
}
export function dueReminder(
  scope: string | undefined,
  taskId: string,
  r: TaskReminder,
  anchor: string,
  now: number,
) {
  const due = reminderInstant(anchor, r.minutes);
  if (!r.enabled || !Number.isFinite(due) || due > now) return false;
  const key = "qah:reminder-delivery:" + JSON.stringify([scope, taskId, r.id]);
  const stamp = JSON.stringify([r.sessionId, anchor, r.minutes]);
  if (localStorage.getItem(key) === stamp) return false;
  localStorage.setItem(key, stamp);
  return true;
}
export function desktopPermission() {
  return typeof Notification === "undefined"
    ? "unsupported"
    : Notification.permission;
}
export async function requestDesktop() {
  return desktopPermission() === "default"
    ? Notification.requestPermission()
    : desktopPermission();
}
export function notifyDesktop(title: string) {
  if (desktopPermission() === "granted") new Notification(title);
}
