  import "./LeadsTable.css";
 
  import {
    Phone,
    Eye,
  } from "lucide-react";
  import { useState } from "react";
  import LeadDetailsDrawer from "../../../common/LeadDetailsDrawer/LeadDetailsDrawer";
  import BulkWhatsAppModal from "../../../LeadManagement/BulkWhatsAppModal";
  import WhatsAppIcon from "../../../common/WhatsAppIcon";

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

  const LeadsTable = ({
  leads = [],
  loading = false,
  onRefresh,
  currentUser = {},
}) => {

  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState(new Set());
  const [isBulkMessageOpen, setIsBulkMessageOpen] = useState(false);

  const selectableLeads = leads.filter((lead) => String(lead.mobile || "").replace(/\D/g, "").length >= 10);
  const selectedLeads = selectableLeads.filter((lead) => selectedLeadIds.has(lead.id));
  const allSelectableLeadsSelected = selectableLeads.length > 0 && selectedLeads.length === selectableLeads.length;

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds((previous) => {
      const next = new Set(previous);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const toggleAllLeadSelection = () => {
    setSelectedLeadIds(allSelectableLeadsSelected ? new Set() : new Set(selectableLeads.map((lead) => lead.id)));
  };

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
        <div className="leads-bulk-toolbar">
          <div className="bulk-toolbar-left">
            <label className="bulk-checkbox-label">
              <input
                type="checkbox"
                checked={allSelectableLeadsSelected}
                onChange={toggleAllLeadSelection}
                className="bulk-checkbox"
              />
              <span className="bulk-checkbox-text">
                Select all valid WhatsApp leads ({selectableLeads.length})
              </span>
            </label>
            {selectedLeads.length > 0 && (
              <span className="bulk-selected-badge">
                {selectedLeads.length} Selected
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={selectedLeads.length === 0}
            onClick={() => setIsBulkMessageOpen(true)}
            className="bulk-wa-btn"
          >
            <WhatsAppIcon size={16} />
            <span>Send Bulk WhatsApp ({selectedLeads.length})</span>
          </button>
        </div>
        <div className="leads-table-scroll">
          <table className="leads-table">

          <thead>

            <tr>
              <th>
                <span className="sr-only">Select</span>
              </th>
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
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.has(lead.id)}
                    disabled={!selectableLeads.some((selectableLead) => selectableLead.id === lead.id)}
                    onChange={() => toggleLeadSelection(lead.id)}
                    aria-label={`Select ${lead.full_name || "lead"} for a WhatsApp message`}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </td>
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
                    {STATUS_LABELS[(lead.status || "").toUpperCase()] || lead.status || "-"}
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
                      href={`https://wa.me/91${String(lead.mobile || "").replace(/\D/g, "").slice(-10)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="action-btn whatsapp-btn"
                      title={`WhatsApp ${lead.full_name}`}
                    >
                      <WhatsAppIcon size={15} />
                      <span>WhatsApp</span>
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

        <BulkWhatsAppModal
          open={isBulkMessageOpen}
          leads={selectedLeads}
          currentUser={currentUser}
          onClose={() => setIsBulkMessageOpen(false)}
          onSuccess={() => {
            setSelectedLeadIds(new Set());
            onRefresh?.();
          }}
        />
      </div>
    );
  };

  export default LeadsTable;
