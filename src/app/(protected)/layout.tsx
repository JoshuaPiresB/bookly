import { getCurrentUser } from "@/lib/current-user";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return <DashboardLayout userName={user?.name ?? "Visitante"} userEmail={user?.email ?? ""}>{children}</DashboardLayout>;
}
