import React from "react";
import { Building, Layers, Share2, Calendar, UserCheck, Globe } from "lucide-react";

/**
 * LeadAcademicInfoCard Component
 * Displays lead source, campaign, course interest, preferred centre, and counsellor assignment.
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

  return (
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
          label="Lead Source"
          value={lead.source}
          icon={<Share2 size={15} className="text-slate-400" />}
        />
        <InfoRow
          label="Campaign Name"
          value={lead.campaign_name || lead.utm_campaign}
          icon={<Layers size={15} className="text-slate-400" />}
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
  );
};

const InfoRow = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </div>
    <p className="text-sm font-extrabold text-slate-900 break-words">
      {value || "-"}
    </p>
  </div>
);

export default LeadAcademicInfoCard;
