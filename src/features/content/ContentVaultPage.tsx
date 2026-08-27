import { useMemo, useState } from "react";
import { Archive, FileText, Lightbulb, Plus, Trash2 } from "lucide-react";
import {
  archiveContentNote,
  createContentNote,
  deleteContentNote,
  listContentNotes,
  moveContentNote,
  updateContentNote,
} from "@/lib/contentVault";
import type { ContentCategory, ContentNote } from "@/types/content";

const categories: Array<{
  id: ContentCategory;
  label: string;
  icon: typeof Lightbulb;
}> = [
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "research", label: "Research", icon: FileText },
  { id: "projects", label: "Projects", icon: FileText },
  { id: "archive", label: "Archive", icon: Archive },
];

export function ContentVaultPage() {
  const [notes, setNotes] = useState<ContentNote[]>(() => listContentNotes());
  const [activeCategory, setActiveCategory] = useState<ContentCategory>("ideas");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const visibleNotes = useMemo(
    () => notes.filter((note) => note.category === activeCategory),
    [notes, activeCategory]
  );

  const refresh = () => setNotes(listContentNotes());

  const resetEditor = () => {
    setTitle("");
    setBody("");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (editingId) {
      updateContentNote(editingId, { title, body, category: activeCategory });
    } else {
      createContentNote({ title, body, category: activeCategory });
    }
    resetEditor();
    refresh();
  };

  const handleEdit = (note: ContentNote) => {
    setActiveCategory(note.category);
    setTitle(note.title);
    setBody(note.body);
    setEditingId(note.id);
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] border border-qah-border-strong bg-[#060806]">
      <header className="border-b border-qah-border-strong px-4 py-4 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-qah-text-subtle">
          03 / CONTENT VAULT
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-qah-text">Content Vault</h1>
            <p className="mt-1 text-sm text-qah-text-muted">Capture and organize ideas, research, project material, and archived notes.</p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-qah-text-subtle">
            {notes.length.toString().padStart(2, "0")} records
          </span>
        </div>
      </header>

      <div className="grid gap-px bg-qah-border lg:grid-cols-[220px_1fr_360px]">
        <aside className="bg-[rgba(7,10,7,0.98)] p-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-qah-text-subtle">INDEX / CATEGORIES</p>
          <div className="space-y-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const count = notes.filter((note) => note.category === category.id).length;
              const active = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category.id);
                    resetEditor();
                  }}
                  className={`flex w-full items-center justify-between border px-3 py-2 text-left text-xs uppercase tracking-[0.1em] transition-colors ${
                    active
                      ? "border-qah-accent-dim bg-[rgba(180,201,107,0.08)] text-qah-text"
                      : "border-transparent text-qah-text-muted hover:border-qah-border"
                  }`}
                >
                  <span className="flex items-center gap-2"><Icon size={14} />{category.label}</span>
                  <span className="font-mono text-[10px] text-qah-text-subtle">{count.toString().padStart(2, "0")}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[420px] bg-[rgba(6,8,6,0.98)] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between border-b border-qah-border pb-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-qah-text-subtle">ACTIVE INDEX</p>
              <h2 className="mt-1 text-lg font-semibold capitalize text-qah-text">{activeCategory}</h2>
            </div>
            <button
              type="button"
              onClick={resetEditor}
              className="inline-flex items-center gap-2 border border-qah-border-strong px-3 py-2 text-xs uppercase tracking-[0.1em] text-qah-text hover:border-qah-accent-dim"
            >
              <Plus size={14} /> New Note
            </button>
          </div>

          {visibleNotes.length === 0 ? (
            <div className="grid min-h-[300px] place-items-center border border-dashed border-qah-border-strong text-center">
              <div className="max-w-sm px-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-qah-text-subtle">INDEX / 00</p>
                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-qah-text">No {activeCategory} records</p>
                <p className="mt-2 text-sm leading-6 text-qah-text-muted">Create the first note in this section using the editor.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleNotes.map((note) => (
                <article key={note.id} className="border border-qah-border-strong bg-[rgba(8,11,8,0.92)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => handleEdit(note)} className="min-w-0 flex-1 text-left">
                      <h3 className="truncate text-sm font-semibold text-qah-text">{note.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-qah-text-muted">{note.body || "No body text"}</p>
                    </button>
                    <div className="flex items-center gap-1">
                      {note.category !== "archive" && (
                        <button type="button" title="Archive" onClick={() => { archiveContentNote(note.id); refresh(); }} className="border border-qah-border p-1.5 text-qah-text-subtle hover:text-qah-accent">
                          <Archive size={13} />
                        </button>
                      )}
                      <button type="button" title="Delete" onClick={() => { deleteContentNote(note.id); if (editingId === note.id) resetEditor(); refresh(); }} className="border border-qah-border p-1.5 text-qah-text-subtle hover:text-red-300">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-qah-border pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-qah-text-subtle">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <select
                      aria-label={`Move ${note.title}`}
                      value={note.category}
                      onChange={(event) => { moveContentNote(note.id, event.target.value as ContentCategory); refresh(); }}
                      className="border border-qah-border bg-[#070a07] px-2 py-1 text-[9px] uppercase text-qah-text-muted"
                    >
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="bg-[rgba(7,10,7,0.98)] p-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-qah-text-subtle">EDITOR / {editingId ? "EDIT" : "NEW"}</p>
          <label className="mt-4 block text-xs uppercase tracking-[0.08em] text-qah-text-muted">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Record title"
              className="mt-1.5 w-full border border-qah-border-strong bg-[#080b08] px-3 py-2 text-sm text-qah-text outline-none focus:border-qah-accent-dim"
            />
          </label>
          <label className="mt-3 block text-xs uppercase tracking-[0.08em] text-qah-text-muted">
            Notes
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              placeholder="Capture the material here..."
              className="mt-1.5 w-full resize-y border border-qah-border-strong bg-[#080b08] px-3 py-2 text-sm leading-6 text-qah-text outline-none focus:border-qah-accent-dim"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 border border-qah-accent-dim bg-[rgba(180,201,107,0.08)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-qah-text disabled:opacity-40"
            >
              {editingId ? "Update Record" : "Save Record"}
            </button>
            {editingId && (
              <button type="button" onClick={resetEditor} className="border border-qah-border-strong px-3 py-2 text-xs uppercase tracking-[0.1em] text-qah-text-muted">Cancel</button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
