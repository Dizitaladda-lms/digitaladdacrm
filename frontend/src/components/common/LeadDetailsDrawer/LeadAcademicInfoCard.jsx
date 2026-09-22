import React from "react";
import { Building, Layers, Share2, Calendar, UserCheck, Globe, RefreshCw, Clock } from "lucide-react";

/**
 * LeadAcademicInfoCard Component
 * Displays lead source, campaign, course interest, preferred centre, counsellor assignment,
 * and multi-source inquiry tracking history.
 */
const LeadAcademicInfoCard = ({ lead }) => {
  if (!lead) return null;

  const formattedDate = lead.created_at
    ? new Date(lead.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  const receivedCount = Number(lead.received_count) || 1;
  const isRepeat = receivedCount > 1;
  const firstSource = lead.first_source || lead.previous_source || lead.source;
  const currentSource = lead.source;

  // Parse history if available
  let historyList = [];
  try {
    if (typeof lead.source_history === "string") {
      historyList = JSON.parse(lead.source_history);
    } else if (Array.isArray(lead.source_history)) {
      historyList = lead.source_history;
    }
  } catch {
    historyList = [];
  }

  return (
    <div className="space-y-4">
      {/* Repeat Inquiry Banner if student inquired more than once */}
      {isRepeat && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="text-amber-600 animate-spin-reverse" size={18} />
            <h4 className="text-sm font-extrabold text-amber-900 uppercase tracking-wider">
              Repeat Inquiry Detected (#{receivedCount} Times)
            </h4>
          </div>
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            This student has submitted inquiries <strong className="font-bold">{receivedCount} times</strong>.
            Originally received from <strong className="font-bold underline">{firstSource}</strong> and latest re-inquiry is from <strong className="font-bold underline">{currentSource}</strong>.
          </p>
          {lead.last_received_at && (
            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
              <Clock size={12} />
              Last inquiry received:{" "}
              {new Date(lead.last_received_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          )}

          {/* History Timeline of Sources if recorded */}
          {historyList.length > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                Inquiry Timeline Breakdown:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {historyList.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs border border-amber-200"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
                        #{item.count || index + 1}
                      </span>
                      <span className="font-bold text-slate-800">{item.source || "UNKNOWN"}</span>
                      {item.domain && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {item.domain}
                        </span>
                      )}
                      {item.course && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          {item.course}
                        </span>
                      )}
                    </div>
                    {item.captured_at && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        {new Date(item.captured_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Lead & Academic Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building className="text-blue-600" size={18} />
          <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Lead & Academic Information
          </h4>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow
            label="Domain / Brand"
            value={lead.domain || "DizitalAdda"}
            icon={<Globe size={15} className="text-slate-400" />}
          />
          <InfoRow
            label="Interested Course"
            value={lead.course_name || lead.interested_course}
            icon={<Building size={15} className="text-slate-400" />}
          />
          <InfoRow
            label="Current Lead Source"
            value={currentSource}
            icon={<Share2 size={15} className="text-slate-400" />}
          />
          {isRepeat ? (
            <InfoRow
              label="1st / Original Source"
              value={firstSource}
              highlight
              icon={<Share2 size={15} className="text-amber-500" />}
            />
          ) : (
            <InfoRow
              label="Campaign Name"
              value={lead.campaign_name || lead.utm_campaign}
              icon={<Layers size={15} className="text-slate-400" />}
            />
          )}
          {isRepeat && (
            <InfoRow
              label="Campaign Name"
              value={lead.campaign_name || lead.utm_campaign}
              icon={<Layers size={15} className="text-slate-400" />}
            />
          )}
          <InfoRow
            label="Inquiries Count"
            value={`${receivedCount} time(s)`}
            highlight={isRepeat}
            icon={<RefreshCw size={15} className={isRepeat ? "text-amber-500" : "text-slate-400"} />}
          />
          <InfoRow
            label="Preferred Centre"
            value={lead.preferred_centre}
            icon={<Building size={15} className="text-slate-400" />}
          />
          <InfoRow
            label="Created Date"
            value={formattedDate}
            icon={<Calendar size={15} className="text-slate-400" />}
          />
          <InfoRow
            label="Assigned Counsellor"
            value={lead.assigned_employee}
            icon={<UserCheck size={15} className="text-slate-400" />}
          />
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, icon, highlight = false }) => (
  <div className={`rounded-xl border p-3 ${highlight ? "border-amber-200 bg-amber-50/40" : "border-slate-100 bg-slate-50/70"}`}>
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className={`text-[11px] font-bold uppercase tracking-wider ${highlight ? "text-amber-700" : "text-slate-500"}`}>
        {label}
      </span>
    </div>
    <p className={`text-sm font-extrabold break-words ${highlight ? "text-amber-900" : "text-slate-900"}`}>
      {value || "-"}
    </p>
  </div>
);

export default LeadAcademicInfoCard;
