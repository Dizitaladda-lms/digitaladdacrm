import React from "react";
import { User, Clock, MessageSquareText } from "lucide-react";

const STATUS_LABELS = {
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow Up",
  WALK_IN: "Walkin",
  ENROLLED: "Enrolled",
  NOT_INTERESTED: "Not Interested",
  NEW: "Interested",
  CONTACTED: "Follow Up",
  QUALIFIED: "Interested",
  ADMISSION: "Enrolled",
  ADMISSION_DONE: "Enrolled",
  LOST: "Not Interested",
};

/**
 * LeadFeedbackHistoryTimeline Component
 * Vertical timeline rendering date-wise interaction history.
 */
const LeadFeedbackHistoryTimeline = ({
  feedbackHistory = [],
  loading = false,
  isAdmin = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
          Interaction & Feedback History ({feedbackHistory.length})
        </h3>
        {isAdmin && (
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Read-Only Audit Trail
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs font-semibold text-slate-500">
          Loading history timeline...
        </div>
      ) : feedbackHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-semibold text-slate-500">
          No feedback has been added yet.
        </div>
      ) : (
        <div className="relative border-l-2 border-blue-500/30 ml-4 space-y-5">
          {feedbackHistory.map((item, idx) => {
            const fields = item.feedback_fields || {};
            const formattedDateTime = item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }) +
                " • " +
                new Date(item.created_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "-";

            return (
              <div key={item.id || idx} className="relative pl-6">
                {/* Vertical timeline node dot */}
                <div className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-blue-600 bg-white shadow-2xs" />

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                  {/* Header Row: Date/Time & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 border border-blue-200 uppercase tracking-wider">
                      {STATUS_LABELS[item.status_at_feedback] || item.status_at_feedback || "STATUS"}
                    </span>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User size={13} className="text-slate-400" />
                        {item.created_by_name || "Counsellor"}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock size={13} className="text-slate-400" />
                        {formattedDateTime}
                      </span>
                    </div>
                  </div>

                  {/* Structured Dynamic Fields Grid */}
                  {Object.keys(fields).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-3 text-xs border border-slate-200/60">
                      {Object.entries(fields).map(([k, v]) => {
                        if (!v) return null;
                        return (
                          <div key={k} className="flex items-start gap-1">
                            <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
                              {k.replace(/_/g, " ")}:
                            </span>
                            <span className="font-extrabold text-slate-900 break-words">{String(v)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Feedback Discussion Remarks */}
                  {item.remarks && (
                    <div className="text-xs text-slate-700 bg-amber-50/80 p-3 rounded-xl border border-amber-200/70 font-medium leading-relaxed">
                      <span className="font-extrabold text-amber-900 uppercase text-[10px] tracking-wider block mb-0.5">
                        Feedback Note:
                      </span>
                      {item.remarks}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeadFeedbackHistoryTimeline;
