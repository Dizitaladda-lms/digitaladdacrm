import { Menu } from "lucide-react";
import SearchBox from "./SearchBox";
import Notification from "./Notification";
import UserMenu from "./UserMenu";
import ThemeToggle from "../../ThemeToggle";

const Topbar = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-20 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Admin Portal</h1>
          <p className="hidden text-sm text-slate-500 sm:block">Operations overview</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:block">
          <SearchBox />
        </div>
        <ThemeToggle />
        <Notification />
        <UserMenu />
      </div>
    </header>
  );
};

export default Topbar;
