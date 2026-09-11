import { requireUser } from "@/lib/current-user";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <DashboardLayout userName={user.name} userEmail={user.email}>{children}</DashboardLayout>;
}
