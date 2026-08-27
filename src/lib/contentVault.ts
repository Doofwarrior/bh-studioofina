import { ContentNoteSchema, type ContentCategory, type ContentNote } from "@/types/content";

const STORAGE_KEY = "qah:content-vault";

function readAll(): ContentNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed
      .map((item) => ContentNoteSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

function writeAll(notes: ContentNote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function listContentNotes(): ContentNote[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createContentNote(input: {
  title: string;
  body?: string;
  category: ContentCategory;
}): ContentNote {
  const now = new Date().toISOString();
  const note = ContentNoteSchema.parse({
    id: crypto.randomUUID(),
    title: input.title.trim(),
    body: input.body ?? "",
    category: input.category,
    createdAt: now,
    updatedAt: now,
  });
  writeAll([note, ...readAll()]);
  return note;
}

export function updateContentNote(
  id: string,
  patch: Partial<Pick<ContentNote, "title" | "body" | "category">>
): ContentNote | null {
  const notes = readAll();
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) return null;

  const next = ContentNoteSchema.parse({
    ...notes[index],
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() : notes[index].title,
    updatedAt: new Date().toISOString(),
  });

  notes[index] = next;
  writeAll(notes);
  return next;
}

export function moveContentNote(id: string, category: ContentCategory): ContentNote | null {
  return updateContentNote(id, { category });
}

export function archiveContentNote(id: string): ContentNote | null {
  return moveContentNote(id, "archive");
}

export function deleteContentNote(id: string): void {
  writeAll(readAll().filter((note) => note.id !== id));
}
