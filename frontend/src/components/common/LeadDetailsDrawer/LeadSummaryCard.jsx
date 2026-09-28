import React from "react";
import { User, Phone, Mail } from "lucide-react";

const STATUS_LABELS = {
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  WALK_IN: "Walkin",
  ENROLLED: "Enrolled",
  NOT_INTERESTED: "Not Interested",
  NEW: "Interested",
  QUALIFIED: "Interested",
  CONTACTED: "Follow Up",
  ADMISSION: "Enrolled",
  ADMISSION_DONE: "Enrolled",
  LOST: "Not Interested",
};

/**
 * LeadSummaryCard Component
 * Displays avatar initials, name, lead code, contact info, status badge, and priority badge.
 */
const LeadSummaryCard = ({ lead }) => {
  if (!lead) return null;

  const initials = lead.full_name
    ? lead.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "LD";

  const priority = (lead.priority || "MEDIUM").toLowerCase();
  const status = lead.status || "NEW";

  const priorityBadgeStyle =
    priority === "high"
      ? "bg-red-50 text-red-700 border-red-200"
      : priority === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Avatar & Identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-extrabold text-white shadow-sm uppercase">
            {initials}
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {lead.full_name || "Lead Details"}
            </h3>
            <p className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
              ID: <span className="text-blue-700 font-bold">{lead.lead_code || "--"}</span>
            </p>
            
            {/* Quick Contact Line */}
            <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-600 font-medium flex-wrap">
              {lead.mobile && (
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  {lead.mobile}
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" />
                  {lead.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status & Priority Badges */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:flex-col sm:items-end">
          {/* Status Badge */}
          <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 border border-blue-200 uppercase tracking-wider">
            {STATUS_LABELS[(status || "").toUpperCase()] || status}
          </span>

          {/* Priority Badge */}
          <span
            className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-extrabold uppercase tracking-wider border ${priorityBadgeStyle}`}
          >
            {lead.priority || "MEDIUM"} Priority
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeadSummaryCard;
