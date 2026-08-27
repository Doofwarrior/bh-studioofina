/**
 * QAL‘AT AL-HAQQ v1 — Router Configuration
 */

import { createBrowserRouter, Navigate, useNavigate } from "react-router-dom";
import { RootLayout } from "@/app/layouts/RootLayout";
import { ProjectLayout } from "@/app/layouts/ProjectLayout";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { ProjectPage } from "@/app/pages/ProjectPage";
import { PromptLibraryPage } from "@/app/pages/PromptLibraryPage";
import { ExportsPage } from "@/app/pages/ExportsPage";
import { SettingsPage } from "@/app/pages/SettingsPage";
import { DecisionArchivePage } from "@/features/decisions/DecisionArchivePage";
import { ContentVaultPage } from "@/features/content/ContentVaultPage";
import { useProjectContext } from "@/app/providers/ProjectProvider";

function DashboardRoute() {
  const navigate = useNavigate();
  return <DashboardPage onOpenSettings={() => navigate("/settings")} />;
}

function DecisionArchiveRoute() {
  const { activeProject } = useProjectContext();
  if (!activeProject) {
    return <Navigate to="/" replace />;
  }
  return <DecisionArchivePage projectSlug={activeProject.slug} />;
}

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      children: [
        {
          index: true,
          element: <DashboardRoute />,
        },
        {
          path: "project",
          element: <ProjectLayout />,
          children: [
            {
              index: true,
              element: <ProjectPage />,
            },
          ],
        },
        {
          path: "content",
          element: <ContentVaultPage />,
        },
        {
          path: "prompts",
          element: <PromptLibraryPage />,
        },
        {
          path: "exports",
          element: <ExportsPage />,
        },
        {
          path: "decisions",
          element: <DecisionArchiveRoute />,
        },
        {
          path: "settings",
          element: <SettingsPage />,
        },
        {
          path: "*",
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ]);
}
