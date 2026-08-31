import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listProjects } from "@/lib/storage";
import { listContentNotes } from "@/lib/contentVault";
import { listPlannerItems } from "@/lib/planner";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import type { ProjectManifest } from "@/types/project";

type SearchResult = {
  id: string;
  kind: "project" | "content" | "planner";
  title: string;
  detail: string;
  project?: ProjectManifest;
};

export function GlobalSearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const navigate = useNavigate();
  const { loadProject } = useProjectContext();

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const projectResults = projects
      .filter((project) => [project.name, project.description ?? "", project.slug, project.status ?? "", project.nextAction ?? "", ...(project.tags ?? [])].join(" ").toLowerCase().includes(needle))
      .map((project) => ({ id: project.id, kind: "project" as const, title: project.name, detail: `${project.type} / ${project.status ?? "active"}`, project }));

    const contentResults = listContentNotes()
      .filter((note) => `${note.title} ${note.body} ${note.category}`.toLowerCase().includes(needle))
      .map((note) => ({ id: note.id, kind: "content" as const, title: note.title, detail: `Content Vault / ${note.category}` }));

    const plannerResults = listPlannerItems()
      .filter((item) => `${item.title} ${item.notes} ${item.status} ${item.dueDate ?? ""}`.toLowerCase().includes(needle))
      .map((item) => ({ id: item.id, kind: "planner" as const, title: item.title, detail: `Planner / ${item.status}${item.dueDate ? ` / ${item.dueDate}` : ""}` }));

    return [...projectResults, ...contentResults, ...plannerResults];
  }, [projects, query]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    setParams(trimmed ? { q: trimmed } : {});
  };

  const openResult = (result: SearchResult) => {
    if (result.kind === "project" && result.project) {
      loadProject(result.project);
      navigate("/project");
      return;
    }
    navigate(result.kind === "content" ? "/content" : "/planner");
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4">
      <header className="border border-qah-border-strong bg-[#060806] p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">05 / FIND</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-qah-text">GLOBAL SEARCH</h1>
        <p className="mt-1 text-sm text-qah-text-muted">Projects, Content Vault, and Planner records.</p>
      </header>

      <form onSubmit={submit} className="flex gap-2 border border-qah-border-strong bg-[rgba(7,10,7,0.94)] p-3">
        <Search size={16} className="mt-2.5 shrink-0 text-qah-accent" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search QAL'AT..." className="min-w-0 flex-1 border border-qah-border-strong bg-[#050705] px-3 py-2 text-sm text-qah-text outline-none focus:border-qah-accent" />
        <button type="submit" className="border border-qah-border-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-qah-text hover:border-qah-accent">Search</button>
      </form>

      <section className="space-y-2">
        {query.trim() && results.length === 0 ? (
          <div className="border border-dashed border-qah-border-strong bg-[rgba(7,10,7,0.72)] p-10 text-center text-sm text-qah-text-muted">No matching records.</div>
        ) : results.map((result) => (
          <button key={`${result.kind}:${result.id}`} type="button" onClick={() => openResult(result)} className="flex w-full items-center justify-between gap-4 border border-qah-border-strong bg-[rgba(7,10,7,0.94)] p-3 text-left hover:border-qah-accent-dim">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-qah-text">{result.title}</span>
              <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text-subtle">{result.detail}</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-qah-accent">OPEN</span>
          </button>
        ))}
      </section>
    </div>
  );
}
