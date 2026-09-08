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

                  <div className="lead-info">

                    <div className="lead-avatar">
                      {lead.full_name
                        ?.split(" ")
                        .map((word) => word[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>

                    <div>

                      <h5>{lead.full_name}</h5>

                      <span>{lead.email || "-"}</span>

                    </div>

                  </div>

                </td>

                <td>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    {lead.domain || "DizitalAdda"}
                  </span>
                </td>

                <td>{(lead.mobile)}</td>

                <td>{lead.campaign_name || "-"}</td>

                <td>{lead.source || "-"}</td>

                <td>

                  <span
                    className={`status ${String(
                      lead.status || ""
                    ).toLowerCase()}`}
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

                <td>{lead.next_followup || "-"}</td>

                <td>

                  <div className="action-buttons">

                  {isMobile && (
    <a
      href={`tel:${lead.mobile}`}
      className="action-btn call-btn"
      title={`Call ${lead.full_name}`}
    >
      <Phone size={16} />
    </a>
  )}

                    <a
    href={`https://wa.me/91${lead.mobile}`}
    target="_blank"
    rel="noopener noreferrer"
    className="action-btn whatsapp-btn"
    title={`WhatsApp ${lead.full_name}`}
  >
    <MessageCircle size={16} />
  </a>

                    <button
    title="View Lead"
    onClick={() => {
      setSelectedLead(lead);
      setIsDrawerOpen(true);
    }}
  >
    <Eye size={16} />
  </button>

                    <button
                      title="Add Follow-up"
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDrawerOpen(true);
                      }}
                    >
                      <CalendarPlus size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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