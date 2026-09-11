import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  return <aside className="fixed inset-x-0 top-0 z-40 border-b border-line bg-white lg:inset-y-0 lg:right-auto lg:w-[248px] lg:border-b-0 lg:border-r">
    <div className="flex h-[72px] items-center px-5 lg:h-[96px] lg:px-7"><Brand /></div>
    <SidebarNav />
  </aside>;
}
