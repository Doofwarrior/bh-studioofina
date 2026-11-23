import { Badge } from "@/components/ui/Badge";
import "@/styles/controls.css";
import {ReminderDelivery} from "@/features/planner/ReminderDelivery";
/** Top-level application shell with primary navigation. */

import {WorkTimer} from "@/features/timer/WorkTimer";
import {backupWorkspace} from "@/lib/storage";
import {runBackup} from "@/lib/storage/applicationBackup";
import { useEffect,useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProjectContext } from "@/app/providers/ProjectProvider";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Archive,
  Search,
  LibraryBig,
  ListTodo,
  CalendarDays,
  Zap,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/content", label: "Content Vault", icon: LibraryBig },
  { to: "/planner", label: "Planner", icon: ListTodo },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/capture", label: "Quick Capture", icon: Zap },
  { to: "/prompts", label: "Prompt Library", icon: MessageSquare },
  { to: "/exports", label: "Exports", icon: Package },
  { to: "/decisions", label: "Decision Archive", icon: Archive, requiresProject: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function RootLayout() {
  const { workspacePath, isConfigured } = useWorkspace();
  const { activeProject } = useProjectContext();
  const isLocalMode = !isConfigured && workspacePath === "LOCAL BROWSER STORAGE";
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(()=>{
    const check=()=>{if(backupWorkspace())void runBackup(true).catch(()=>{});};
    check();const timer=window.setInterval(check, 15*60*1000);
    return ()=>window.clearInterval(timer);
  },[isConfigured,workspacePath]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const workspaceIndicator = <Badge variant={isConfigured ? "success" : isLocalMode ? "default" : "warning"}>{isConfigured ? "WORKSPACE READY" : isLocalMode ? "LOCAL MODE" : "WORKSPACE REQUIRED"}</Badge>;

  return (
    <div className="qah-shell relative z-10 min-h-screen">
      <header className="qah-system-bar">
        <div className="qah-system-bar__identity gap-2">
          <span>QAL&apos;AT AL-HAQQ</span>
          <span className="qah-system-bar__identity-arabic font-arabic" lang="ar" dir="rtl">قَلْعَةُ الْحَقّ</span>
        </div>
        <form className="qah-system-bar__command" onSubmit={handleSearch} role="search" aria-label="Global search">
          <Search size={13} aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="SEARCH QAL'AT"
            className="min-w-0 flex-1 bg-transparent font-mono text-[9px] uppercase tracking-[0.12em] text-qah-text outline-none placeholder:text-qah-text-subtle"
            aria-label="Search projects, content and planner records"
          />
        </form>
        <div className="qah-system-bar__utilities">
          <WorkTimer/><ReminderDelivery/>
          <span className="qah-system-bar__status">{workspaceIndicator}</span>
          <img src="/citadel-q.png" alt="QAL'AT system mark" className="h-7 w-7 shrink-0 object-contain" />
        </div>
      </header>

      <div className="qah-shell__body">
        <aside className="qah-navigation-rail">
          <div className="qah-navigation-rail__label">NAV / 01</div>
          <nav className="qah-navigation-rail__links" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isUnavailable = item.requiresProject && !activeProject;

              if (isUnavailable) {
                return (
                  <span
                    key={item.to}
                    className="qah-navigation-rail__link cursor-not-allowed opacity-45"
                    aria-disabled="true"
                    title="Open a project to access Decision Archive"
                  >
                    <item.icon size={16} />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.12em] text-qah-text-subtle">
                      Project required
                    </span>
                  </span>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "qah-navigation-rail__link",
                      isActive ? "qah-navigation-rail__link--active" : ""
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="qah-navigation-rail__footer">
            <span>V1.0.0</span>
            {workspaceIndicator}
          </div>
        </aside>

        <main className="qah-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
