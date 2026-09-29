import { Search } from "lucide-react";

const SearchBox = () => {
  return (
    <div className="flex h-9.5 w-64 md:w-72 lg:w-80 items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3 transition-all focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Search
          size={16}
          className="text-slate-400 flex-shrink-0"
        />
        <input
          placeholder="Search leads, campaigns, data..."
          className="w-full bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none"
        />
      </div>
      <kbd className="hidden lg:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 shadow-2xs">
        ⌘K
      </kbd>
    </div>
  );
};

export default SearchBox;