import { GlobalSearch } from "./global-search";
import { AccountMenu } from "./account-menu";

export function Topbar({ userName, userEmail }: { userName: string; userEmail: string }) {
  return <header className="sticky top-16 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm lg:top-0">
    <div className="mx-auto flex h-16 max-w-[1520px] items-center gap-2 px-4 sm:h-[72px] sm:gap-3 sm:px-6 lg:px-10 2xl:px-12">
      <GlobalSearch />
      <div className="ml-auto"><AccountMenu name={userName} email={userEmail} /></div>
    </div>
  </header>;
}
