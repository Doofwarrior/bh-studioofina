import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listProjects } from "@/lib/storage";
import { listContentNotes } from "@/lib/contentVault";
import {workResults,initial} from "../calendar/workInsights";
import {WorkFilters,SavedView} from "../calendar/WorkFilters";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import type { ProjectManifest } from "@/types/project";

type SearchResult = {
  id: string;
  kind: "project" | "content" | "planner" | "calendar" | "activity";
  title: string;
  detail: string;
  project?: ProjectManifest;
  url?:string;
};

export function GlobalSearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [filters,setFilters]=useState(initial);
  const [,refresh]=useState(0);
  const [limit,setLimit]=useState(50);
  useEffect(()=>{const fn=()=>refresh(n=>n+1);window.addEventListener("storage",fn);window.addEventListener("qah:history",fn);return()=>{window.removeEventListener("storage",fn);window.removeEventListener("qah:history",fn)}},[]);
  const navigate = useNavigate();
  const { loadProject } = useProjectContext();

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const results = ((): SearchResult[] => {
    const needle = query.trim().toLowerCase();
    const filtered=filters.project!=="all"||!!filters.from||!!filters.to||!!filters.status;
    if (!needle&&!filtered) return [];

    const projectResults = projects
      .filter((project) => [project.name, project.description ?? "", project.slug, project.status ?? "", project.nextAction ?? "", ...(project.tags ?? [])].join(" ").toLowerCase().includes(needle))
      .map((project) => ({ id: project.id, kind: "project" as const, title: project.name, detail: `${project.type} / ${project.status ?? "active"}`, project }));

    const contentResults = listContentNotes()
      .filter((note) => `${note.title} ${note.body} ${note.category}`.toLowerCase().includes(needle))
      .map((note) => ({ id: note.id, kind: "content" as const, title: note.title, detail: `Content Vault / ${note.category}` }));

    return [...(filtered?[]:projectResults), ...(filtered?[]:contentResults), ...workResults(projects,filters,query)];
  })();

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
    if(result.url){navigate(result.url);return;}
    navigate(result.kind === "content" ? "/content" : "/planner");
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-4">
      <header className="border border-qah-border-strong bg-[#060806] p-4 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-qah-text-subtle">05 / FIND</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-qah-text">GLOBAL SEARCH</h1>
        <p className="mt-1 text-sm text-qah-text-muted">Search projects, Content Vault, tasks, Calendar items and activity.</p>
      </header>

      <form onSubmit={submit} className="flex gap-2 border border-qah-border-strong bg-[rgba(7,10,7,0.94)] p-3">
        <Search size={16} className="mt-2.5 shrink-0 text-qah-accent" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search QAL'AT..." className="min-w-0 flex-1 border border-qah-border-strong bg-[#050705] px-3 py-2 text-sm text-qah-text outline-none focus:border-qah-accent" />
        <button type="submit" className="qah-control qah-control--secondary border border-qah-border-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-qah-text hover:border-qah-accent">Search</button>
      </form>

      <WorkFilters projects={projects} f={filters} set={setFilters}><label>Work status <select className="bg-qah-bg" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Any status</option>{["todo","doing","done","scheduled"].map(s=><option key={s}>{s}</option>)}</select></label></WorkFilters>
      <SavedView section="search" value={{filters,query}} apply={v=>{setFilters(v.filters);setQuery(v.query);setParams(v.query?{q:v.query}:{})}}/>
      <section className="space-y-2">
        {(query.trim()||filters.project!=="all"||filters.from||filters.to||filters.status) && results.length === 0 ? (
          <div className="border border-dashed border-qah-border-strong bg-[rgba(7,10,7,0.72)] p-10 text-center text-sm text-qah-text-muted">No matching records.</div>
        ) : results.slice(0,limit).map((result) => (
          <button key={`${result.kind}:${result.id}`} type="button" onClick={() => openResult(result)} className="flex w-full items-center justify-between gap-4 border border-qah-border-strong bg-[rgba(7,10,7,0.94)] p-3 text-left hover:border-qah-accent-dim">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-qah-text">{result.title}</span>
              <span className="data-meta mt-1 block">{result.detail.slice(0,300)}</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-qah-accent">OPEN</span>
          </button>
        ))}
        {results.length>limit&&<button onClick={()=>setLimit(n=>n+50)}>Show more results</button>}
      </section>
    </div>
  );
}
