import { useState } from "react";
import { ArrowRight, Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createContentNote, listContentNotes } from "@/lib/contentVault";

export function QuickCapturePage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [count, setCount] = useState(() => listContentNotes().length);

  const handleCapture = () => {
    if (!title.trim()) return;
    const note = createContentNote({ title, body, category: "ideas" });
    setSavedId(note.id);
    setTitle("");
    setBody("");
    setCount(listContentNotes().length);
  };

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-4">
      <header className="border border-qah-border-strong bg-[#060806] p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">04 / CAPTURE</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-qah-text">QUICK CAPTURE</h1>
            <p className="mt-1 text-sm text-qah-text-muted">Record first. Organize later.</p>
          </div>
          <span className="border border-qah-border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-subtle">VAULT RECORDS {count}</span>
        </div>
      </header>

      <section className="border border-qah-border-strong bg-[rgba(7,10,7,0.94)] p-4">
        <div className="flex items-center gap-2 border-b border-qah-border pb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-qah-text-subtle">
          <Inbox size={13} className="text-qah-accent" /> INBOX / IDEAS
        </div>
        <div className="mt-4 space-y-3">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Capture title" className="w-full border border-qah-border-strong bg-[#050705] px-3 py-3 text-sm text-qah-text outline-none focus:border-qah-accent" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Context, fragment, link, question, or note..." rows={8} className="w-full resize-y border border-qah-border-strong bg-[#050705] px-3 py-3 text-sm leading-6 text-qah-text outline-none focus:border-qah-accent" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-subtle">Saved directly to Content Vault / Ideas</span>
            <Button onClick={handleCapture} disabled={!title.trim()}><Plus size={14} className="mr-2" />Capture</Button>
          </div>
        </div>
      </section>

      {savedId && (
        <div className="flex items-center gap-2 border border-qah-border bg-[rgba(7,10,7,0.72)] p-3 font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-muted">
          <ArrowRight size={12} className="text-qah-accent" /> CAPTURED / {savedId.slice(0, 8).toUpperCase()}
        </div>
      )}
    </div>
  );
}
