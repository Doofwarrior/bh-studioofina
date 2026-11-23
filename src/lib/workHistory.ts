export interface WorkEvent {
  id: string;
  at: number;
  action: string;
  title: string;
  detail: string;
  projectId?: string;
  taskId?: string;
  slot?: string;
  itemId?: string;
}
const prefix = "qah:work-history:";
export let historyWarning = "";
export function appendHistory(event: Omit<WorkEvent, "id" | "at">) {
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(
      prefix + id,
      JSON.stringify({ ...event, id, at: Date.now() }),
    );
  } catch {
    historyWarning =
      "A work change was saved, but its history entry could not be stored.";
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("qah:history"));
}
export function listHistory(): WorkEvent[] {
  const rows: WorkEvent[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      const raw = localStorage.getItem(key);
      if (raw) rows.push(JSON.parse(raw));
    }
  }
  return rows.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
}
