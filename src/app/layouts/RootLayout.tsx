/**
 * BH Studio v1.0 — Root Layout
 *
 * The top-level layout with sidebar navigation.
 */

import { Outlet, NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/prompts", label: "Prompt Library", icon: MessageSquare },
  { to: "/exports", label: "Exports", icon: Package },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function RootLayout() {
  return (
    <div className="flex h-screen bg-[var(--studio-bg)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-[var(--studio-surface)] flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b p-4">
          <Sparkles size={20} className="text-[var(--studio-accent)]" />
          <span className="text-lg font-bold text-[var(--studio-text)]">
            BH Studio
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--studio-accent)]/10 text-[var(--studio-accent)]"
                    : "text-[var(--studio-text-muted)] hover:bg-[var(--studio-surface-elevated)] hover:text-[var(--studio-text)]"
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-4 text-xs text-[var(--studio-text-subtle)]">
          <p>v1.0.0</p>
          <p>Workspace ready</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
