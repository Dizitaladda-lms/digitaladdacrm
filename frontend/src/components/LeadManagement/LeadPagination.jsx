import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LeadPagination = ({
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  limit = 10,
  onPageChange,
}) => {
  const start =
    totalRecords === 0
      ? 0
      : (page - 1) * limit + 1;

  const end = Math.min(
    page * limit,
    totalRecords
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Summary */}
      <div>
        <p className="text-xs font-medium text-slate-500">
          Showing{" "}
          <span className="font-bold text-slate-900">
            {start}–{end}
          </span>{" "}
          of{" "}
          <span className="font-bold text-slate-900">
            {totalRecords}
          </span>{" "}
          Leads
        </p>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Current Page Pill */}
        <div className="flex h-8.5 min-w-[34px] items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-2xs">
          {page}
        </div>

        {/* Total Pages */}
        <span className="px-1 text-xs font-semibold text-slate-500">
          of {totalPages || 1}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default LeadPagination;