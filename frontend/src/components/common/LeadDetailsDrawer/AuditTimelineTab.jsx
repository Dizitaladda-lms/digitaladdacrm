import React, { useState } from "react";
import { Clock, User, MessageSquare, Send } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * AuditTimelineTab Component (Tab 4)
 * Clean Enterprise Audit Timeline & Internal Notes Composer
 */
const AuditTimelineTab = ({
  feedbackHistory = [],
  historyLoading = false,
  lead,
  isEditable = true,
  onSaveQuickNote,
}) => {
  const [quickNote, setQuickNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    try {
      setAddingNote(true);
      if (typeof onSaveQuickNote === "function") {
        await onSaveQuickNote(quickNote.trim());
        setQuickNote("");
      }
    } finally {
      setAddingNote(false);
    }
  };

  let parsedHistory = [];
  try {
    if (typeof lead?.source_history === "string") {
      parsedHistory = JSON.parse(lead.source_history);
    } else if (Array.isArray(lead?.source_history)) {
      parsedHistory = lead.source_history;
    }
  } catch {
    parsedHistory = [];
  }

  const initialSource = lead?.first_source || lead?.previous_source || lead?.source || "WEBSITE";

  return (
    <>
      {/* Quick Internal Notes Composer Card */}
      {isEditable && (
        <div className="crm-card">
          <div className="crm-card-header">
            <MessageSquare className="text-blue-600" size={20} />
            <div>
              <h3 className="crm-card-title">Quick Internal Note Composer</h3>
              <p className="crm-card-subtitle">
                Add an internal note or discussion point without changing the lead status
              </p>
            </div>
          </div>

          <form onSubmit={handleNoteSubmit} className="crm-field">
            <textarea
              rows={3}
              placeholder="Type internal note for team or counsellor reminder..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="crm-textarea"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
              <button
                type="submit"
                disabled={addingNote || !quickNote.trim()}
                className="crm-btn-primary"
                style={{ height: "38px", padding: "0 18px", fontSize: "13px" }}
              >
                <Send size={14} />
                <span>{addingNote ? "Saving Note..." : "Save Internal Note"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full Audit Timeline Card */}
      <div className="crm-card">
        <div className="crm-card-header">
          <Clock className="text-blue-600" size={20} />
          <div>
            <h3 className="crm-card-title">
              Full Audit Timeline ({feedbackHistory.length + 1 + (parsedHistory.length > 1 ? parsedHistory.length - 1 : 0)})
            </h3>
            <p className="crm-card-subtitle">
              Chronological log of lead capture, repeat inquiries, status updates, and discussions
            </p>
          </div>
        </div>

        {/* Initial Lead Creation Event & Re-inquiries */}
        <div className="crm-timeline" style={{ marginBottom: "20px" }}>
          <div className="crm-timeline-item">
            <div className="crm-timeline-dot" style={{ borderColor: "#16A34A" }} />
            <div className="crm-timeline-card">
              <div className="crm-timeline-header">
                <span className="crm-badge crm-badge-status" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                  LEAD CAPTURED {parsedHistory.length > 1 ? "(1ST INQUIRY)" : ""}
                </span>
                <div className="crm-timeline-meta">
                  <span>Source: {initialSource}</span>
                  <span>
                    {lead?.created_at
                      ? new Date(lead.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }) +
                        " • " +
                        new Date(lead.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Initial Entry"}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "#334155", fontWeight: 500 }}>
                Lead initially captured via <strong>{initialSource}</strong> form with Code <strong>{lead?.lead_code || "--"}</strong>.
              </div>
            </div>
          </div>

          {/* Re-inquiries from source_history */}
          {Array.isArray(parsedHistory) && parsedHistory.slice(1).map((inquiry, i) => (
            <div key={i} className="crm-timeline-item" style={{ marginTop: "12px" }}>
              <div className="crm-timeline-dot" style={{ borderColor: "#F59E0B" }} />
              <div className="crm-timeline-card" style={{ borderLeft: "3px solid #F59E0B" }}>
                <div className="crm-timeline-header">
                  <span className="crm-badge" style={{ backgroundColor: "#FEF3C7", color: "#92400E", fontWeight: 700 }}>
                    RE-INQUIRY #{inquiry.count || i + 2}
                  </span>
                  <div className="crm-timeline-meta">
                    <span>Source: {inquiry.source || "UNKNOWN"}</span>
                    <span>
                      {inquiry.captured_at
                        ? new Date(inquiry.captured_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }) +
                          " • " +
                          new Date(inquiry.captured_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#334155", fontWeight: 500 }}>
                  Same student submitted another inquiry from <strong>{inquiry.source}</strong>
                  {inquiry.domain ? ` (${inquiry.domain})` : ""}
                  {inquiry.course ? ` for course "${inquiry.course}"` : ""}.
                </div>
              </div>
            </div>
          ))}
        </div>

        {historyLoading ? (
          <div style={{ textAlign: "center", padding: "32px", fontSize: "13px", color: "#64748B" }}>
            Loading audit timeline...
          </div>
        ) : feedbackHistory.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px dashed #CBD5E1",
              fontSize: "13px",
              color: "#64748B",
            }}
          >
            No status updates logged yet.
          </div>
        ) : (
          <div className="crm-timeline">
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
                <div key={item.id || idx} className="crm-timeline-item">
                  <div className="crm-timeline-dot" />
                  <div className="crm-timeline-card">
                    <div className="crm-timeline-header">
                      <span className="crm-badge crm-badge-status">
                        {item.status_at_feedback || "STATUS"}
                      </span>

                      <div className="crm-timeline-meta">
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <User size={13} />
                          Counsellor: {item.created_by_name || "Dizital Adda Counsellor"}
                        </span>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontFamily: "monospace",
                          }}
                        >
                          <Clock size={13} />
                          {formattedDateTime}
                        </span>
                      </div>
                    </div>

                    {/* Key-Value Fields Grid */}
                    {Object.keys(fields).length > 0 && (
                      <div className="crm-timeline-fields">
                        {Object.entries(fields).map(([k, v]) => {
                          if (!v || typeof v === "object") return null;
                          return (
                            <div key={k}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: "#64748B",
                                  textTransform: "uppercase",
                                  fontSize: "10px",
                                }}
                              >
                                {k.replace(/_/g, " ")}:
                              </span>{" "}
                              <strong style={{ color: "#0F172A" }}>{String(v)}</strong>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Remarks / Discussion Note */}
                    {item.remarks && (
                      <div className="crm-timeline-note">
                        <strong
                          style={{
                            display: "block",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            color: "#92400E",
                            marginBottom: "2px",
                          }}
                        >
                          Counsellor Discussion Note:
                        </strong>
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
    </>
  );
};

export default AuditTimelineTab;
