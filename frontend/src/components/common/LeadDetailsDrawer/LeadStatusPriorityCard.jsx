import React from "react";
import { Tag, AlertCircle, Calendar } from "lucide-react";

/**
 * LeadStatusPriorityCard Component
 * Displays status selection control and priority information.
 */
const LeadStatusPriorityCard = ({
  lead,
  isCounsellor,
  selectedStatus,
  onStatusChange,
  updatingStatus,
  statusOptions = [],
}) => {
  if (!lead) return null;

  const priority = (lead.priority || "MEDIUM").toLowerCase();
  const priorityStyle =
    priority === "high"
      ? "bg-red-50 text-red-700 border-red-200"
      : priority === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const formattedFollowup = lead.next_followup
    ? new Date(lead.next_followup).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Tag className="text-blue-600" size={18} />
        <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
          Status & Priority Management
        </h4>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Status Section */}
        {isCounsellor ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-blue-900">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                Current Status
              </span>
              {updatingStatus && (
                <span className="text-[11px] font-bold text-blue-600 animate-pulse">
                  Updating...
                </span>
              )}
            </div>
            <select
              value={selectedStatus || lead.status?.toUpperCase() || "NEW"}
              onChange={(e) => onStatusChange?.(e.target.value)}
              disabled={updatingStatus}
              className="w-full mt-1 rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-extrabold text-blue-900 shadow-2xs outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Current Status
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 border border-blue-200 uppercase tracking-wider">
              {lead.status || "NEW"}
            </span>
          </div>
        )}

        {/* Priority Badge Section */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Lead Priority (Auto)
          </span>
          <span
            className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-extrabold uppercase tracking-wider border ${priorityStyle}`}
          >
            {lead.priority || "MEDIUM"} Priority
          </span>
        </div>

        {/* Followup Display */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:col-span-2">
          <div className="flex items-center gap-1.5 mb-1 text-slate-500">
            <Calendar size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Next Scheduled Follow-up
            </span>
          </div>
          <p className="text-sm font-extrabold text-slate-900">
            {formattedFollowup}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeadStatusPriorityCard;
