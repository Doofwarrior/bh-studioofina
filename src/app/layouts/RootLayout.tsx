/** Top-level application shell with primary navigation. */

import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Archive,
  Command,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/prompts", label: "Prompt Library", icon: MessageSquare },
  { to: "/exports", label: "Exports", icon: Package },
  { to: "/decisions", label: "Decision Archive", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function RootLayout() {
  const { isConfigured } = useWorkspace();

  return (
    <div className="qah-shell relative z-10 min-h-screen bg-transparent">
      <header className="qah-system-bar">
        <div className="qah-system-bar__identity">
          <span>QAL&apos;AT AL-HAQQ</span>
          <span className="qah-system-bar__identity-arabic font-arabic" lang="ar" dir="rtl">قَلْعَةُ الْحَقّ</span>
        </div>
        <div className="qah-system-bar__command" aria-label="Command workspace status">
          <Command size={13} aria-hidden="true" />
          <span>LOCAL WORKSPACE / COMMAND INDEX</span>
        </div>
        <div className="qah-system-bar__utilities">
          <span className="qah-system-bar__status"><i aria-hidden="true" />{isConfigured ? "WORKSPACE READY" : "WORKSPACE REQUIRED"}</span>
        </div>
      </header>

      <div className="qah-shell__body">
        <aside className="qah-navigation-rail">
          <div className="qah-navigation-rail__label">NAV / 01</div>
          <nav className="qah-navigation-rail__links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "qah-navigation-rail__link",
                  isActive
                    ? "qah-navigation-rail__link--active"
                    : ""
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
          </nav>
          <div className="qah-navigation-rail__footer">
            <span>V1.0.0</span>
            <span><i aria-hidden="true" />{isConfigured ? "WORKSPACE READY" : "WORKSPACE REQUIRED"}</span>
          </div>
        </aside>

        <main className="qah-shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
