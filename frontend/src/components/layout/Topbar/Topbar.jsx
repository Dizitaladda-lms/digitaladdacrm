import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import SearchBox from "./SearchBox";
import Notification from "./Notification";
import UserMenu from "./UserMenu";
import { useAuth } from "../../../context/AuthContext";

const Topbar = ({ isSidebarOpen = true, onMenuClick }) => {
  const { user } = useAuth();
  const role = user?.role;

  const portalTitle =
    role === "SUPER_ADMIN"
      ? "Super Admin Workspace"
      : role === "MANAGER" || role === "ADMIN"
      ? "Manager Workspace"
      : "CRM Workspace";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onMenuClick}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all cursor-pointer ${
            !isSidebarOpen
              ? "border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ring-2 ring-indigo-100"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-indigo-600 shadow-2xs"
          }`}
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div>
          <h1 className="text-[15px] sm:text-[17px] font-bold text-slate-900 tracking-tight leading-tight">
            {portalTitle}
          </h1>
          <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[11.5px] font-semibold text-slate-500 tracking-wide uppercase">
              Connected & Active
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3.5">
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
