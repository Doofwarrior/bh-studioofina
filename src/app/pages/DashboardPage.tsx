import { DashboardPage as DashboardFeature } from "@/features/dashboard/DashboardPage";

interface DashboardPageProps {
  onOpenSettings: () => void;
}

export function DashboardPage({ onOpenSettings }: DashboardPageProps) {
  return <DashboardFeature onOpenSettings={onOpenSettings} />;
}
