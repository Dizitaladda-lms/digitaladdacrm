import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import SearchBox from "./SearchBox";
import Notification from "./Notification";
import UserMenu from "./UserMenu";

const Topbar = ({ isSidebarOpen = true, onMenuClick }) => {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-colors shadow-2xs"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg leading-tight">Admin Portal</h1>
          <p className="hidden text-xs text-slate-500 sm:block">Operations overview</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block">
          <SearchBox />
        </div>
        <Notification />
        <UserMenu />
      </div>
    </header>
  );
};

export default Topbar;
