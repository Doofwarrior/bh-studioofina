export type PlannerStatus = "todo" | "doing" | "done";

export interface PlannerItem {
  id: string;
  title: string;
  notes: string;
  dueDate?: string;
  status: PlannerStatus;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "qah:planner";

function readAll(): PlannerItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlannerItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: PlannerItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listPlannerItems(): PlannerItem[] {
  return readAll().sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function createPlannerItem(input: { title: string; notes?: string; dueDate?: string }): PlannerItem {
  const now = new Date().toISOString();
  const item: PlannerItem = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    notes: input.notes?.trim() ?? "",
    dueDate: input.dueDate || undefined,
    status: "todo",
    createdAt: now,
    updatedAt: now,
  };
  writeAll([item, ...readAll()]);
  return item;
}

export function updatePlannerItem(id: string, patch: Partial<Pick<PlannerItem, "title" | "notes" | "dueDate" | "status">>): PlannerItem | null {
  const items = readAll();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const next: PlannerItem = {
    ...items[index],
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : items[index].title,
    notes: patch.notes !== undefined ? patch.notes.trim() : items[index].notes,
    dueDate: patch.dueDate || undefined,
    updatedAt: new Date().toISOString(),
  };
  items[index] = next;
  writeAll(items);
  return next;
}

export function deletePlannerItem(id: string): void {
  writeAll(readAll().filter((item) => item.id !== id));
}
