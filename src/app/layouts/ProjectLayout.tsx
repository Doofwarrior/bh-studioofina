/**
 * BH Studio v1.0 — Project Layout
 *
 * Layout used when a project is actively open.
 * Currently delegates to RootLayout; can be extended with project-specific chrome.
 */

import { Outlet } from "react-router-dom";

export function ProjectLayout() {
  return <Outlet />;
}
