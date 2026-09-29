import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ToastProvider } from "@/components/ui/toast-provider";
import { LoginRequiredProvider } from "@/components/auth/login-required-provider";

export function DashboardLayout({ children, userName, userEmail }: { children: React.ReactNode; userName: string; userEmail: string }) {
  return <ToastProvider><LoginRequiredProvider authenticated={Boolean(userEmail)}><div className="min-h-dvh bg-canvas text-ink">
    <Sidebar />
    <div className="pt-[126px] lg:pl-[248px] lg:pt-0"><Topbar userName={userName} userEmail={userEmail} /><main className="mx-auto max-w-[1520px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10 2xl:px-12">{children}</main></div>
  </div></LoginRequiredProvider></ToastProvider>;
}
