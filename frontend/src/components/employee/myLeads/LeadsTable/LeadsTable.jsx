  import "./LeadsTable.css";
 
  import {
    Phone,
    MessageCircle,
    Eye,
    CalendarPlus,
  } from "lucide-react";
  import { useState } from "react";
  import LeadDetailsDrawer from "../../../common/LeadDetailsDrawer/LeadDetailsDrawer";

  const LeadsTable = ({
  leads = [],
  loading = false,
  onRefresh,
}) => {

  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (loading) {
      return (
        <div className="leads-table-card">
          <div style={{ padding: "30px", textAlign: "center" }}>
            Loading Leads...
          </div>
        </div>
      );
    }

    if (leads.length === 0) {
      return (
        <div className="leads-table-card">
          <div style={{ padding: "30px", textAlign: "center" }}>
            No Leads Assigned
          </div>
        </div>
      );
    }

    return (
      <div className="leads-table-card">
        <div className="leads-table-scroll">
          <table className="leads-table">

          <thead>

            <tr>
              <th>Lead</th>
              <th>Domain</th>
              <th>Mobile</th>
              <th>Course</th>
              <th>Source</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Next Follow-up</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <div
                    className="lead-info"
                    onClick={() => {
                      setSelectedLead(lead);
                      setIsDrawerOpen(true);
                    }}
                    title="Click to view full lead details"
                    style={{ cursor: "pointer" }}
                  >
                    <div className="lead-avatar">
                      {lead.full_name
                        ?.split(" ")
                        .map((word) => word[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h5 style={{ color: "#1d4ed8", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                        {lead.full_name}
                      </h5>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {lead.lead_code || lead.email || "-"}
                      </span>
                    </div>
                  </div>
                </td>

                <td>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    {lead.domain || "DizitalAdda"}
                  </span>
                </td>

                <td style={{ fontWeight: 600, color: "#1e293b" }}>
                  <a href={`tel:${lead.mobile}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {lead.mobile}
                  </a>
                </td>

                <td>
                  <span style={{ fontSize: "13px", color: "#334155" }}>
                    {lead.interested_course || lead.campaign_name || "-"}
                  </span>
                </td>

                <td>
                  <div className="flex flex-col gap-0.5 items-start">
                    <span className="font-medium text-slate-700">{lead.source || "-"}</span>
                    {Number(lead.received_count) > 1 && (
                      <span
                        className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200"
                        title={`Inquiry #${lead.received_count}. Originally from ${lead.first_source || lead.previous_source || lead.source}`}
                      >
                        #{lead.received_count} (1st: {lead.first_source || lead.previous_source || "Earlier"})
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <span
                    className={`status ${String(
                      lead.status || ""
                    ).toLowerCase().replace(/_/g, "-")}`}
                  >
                    {lead.status || "-"}
                  </span>
                </td>

                <td>
                  <span
                    className={`priority ${String(
                      lead.priority || ""
                    ).toLowerCase()}`}
                  >
                    {lead.priority || "-"}
                  </span>
                </td>

                <td style={{ fontSize: "12px", color: "#64748b" }}>
                  {lead.next_followup
                    ? new Date(lead.next_followup).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </td>

                <td>
                  <div className="action-buttons" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      className="view-more-btn"
                      title="View full lead details, feedback and timeline"
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDrawerOpen(true);
                      }}
                    >
                      <Eye size={15} />
                      <span>View More</span>
                    </button>

                    <a
                      href={`https://wa.me/91${lead.mobile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn whatsapp-btn"
                      title={`WhatsApp ${lead.full_name}`}
                    >
                      <MessageCircle size={16} />
                    </a>

                    {isMobile && (
                      <a
                        href={`tel:${lead.mobile}`}
                        className="action-btn call-btn"
                        title={`Call ${lead.full_name}`}
                      >
                        <Phone size={16} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <LeadDetailsDrawer
          open={isDrawerOpen}
          lead={selectedLead}
          onClose={() => setIsDrawerOpen(false)}
          onStatusUpdated={onRefresh}
          role="counsellor"
        />
      </div>
    );
  };

  export default LeadsTable;