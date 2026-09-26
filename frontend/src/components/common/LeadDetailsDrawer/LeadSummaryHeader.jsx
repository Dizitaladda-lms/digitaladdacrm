import React from "react";
import { Phone, Mail, MapPin, Tag, X, MessageCircle } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * LeadSummaryHeader Component
 * Guided Counselling Header with student avatar, dynamic status, smart priority badge,
 * and 1-click Phone (`tel:`) + WhatsApp (`wa.me`) triggers.
 */
const LeadSummaryHeader = ({ lead, onClose, onOpenCallTab }) => {
  if (!lead) return null;

  const initials = lead.full_name
    ? lead.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "LD";

  const rawPriority = (lead.priority || "MEDIUM").toUpperCase();
  const priorityClass =
    rawPriority === "HIGH"
      ? "crm-badge-high"
      : rawPriority === "MEDIUM"
      ? "crm-badge-medium"
      : "crm-badge-low";

  const priorityLabel = rawPriority === "HIGH" ? "HIGH 🔥" : rawPriority;

  const locationText = [lead.city, lead.state, lead.country || "India"]
    .filter(Boolean)
    .join(", ");

  const cleanMobile = (lead.mobile || "").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(
    `Hello ${lead.full_name || ""}, warm greetings from Dizital Adda Admissions Team!`
  )}`;

  return (
    <div className="crm-header">
      <div className="crm-header-info">
        <div className="crm-avatar">{initials}</div>
        <div>
          <div className="crm-header-meta" style={{ marginTop: 0 }}>
            <h2 className="crm-header-title">{lead.full_name || "Student Lead"}</h2>
            <span>
              Lead Code: <strong style={{ color: "#2563EB" }}>{lead.lead_code || "--"}</strong>
            </span>
          </div>

          <div className="crm-header-meta">
            {lead.mobile && (
              <span className="crm-header-meta-item">
                <Phone size={13} />
                {lead.mobile}
              </span>
            )}
            {lead.email && (
              <span className="crm-header-meta-item">
                <Mail size={13} />
                {lead.email}
              </span>
            )}
            {locationText && (
              <span className="crm-header-meta-item">
                <MapPin size={13} />
                {locationText}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        {/* Quick Communication Trigger Buttons */}
        {cleanMobile && (
          <>
            <button
              type="button"
              onClick={onOpenCallTab}
              title="Call Student with Cloud Recording"
              className="crm-btn-primary"
              style={{
                height: "36px",
                padding: "0 12px",
                fontSize: "12px",
                backgroundColor: "#16A34A",
                cursor: "pointer",
                border: "none",
              }}
            >
              <Phone size={14} />
              <span>Call & Record 🎧</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp Student"
              className="crm-btn-primary"
              style={{
                height: "36px",
                padding: "0 12px",
                fontSize: "12px",
                backgroundColor: "#25D366",
              }}
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>
          </>
        )}

        {/* Priority & Status Badges */}
        <span className={`crm-badge ${priorityClass}`}>
          {priorityLabel} PRIORITY
        </span>

        {Number(lead.received_count) > 1 && (
          <span
            className="crm-badge"
            style={{
              backgroundColor: "#FEF3C7",
              color: "#92400E",
              border: "1px solid #FDE68A",
              fontWeight: 700,
            }}
            title={`Lead inquired ${lead.received_count} times. Originally from ${lead.first_source || lead.previous_source || lead.source}`}
          >
            #{lead.received_count} RE-INQUIRY
          </span>
        )}

        <span className="crm-badge crm-badge-status">
          <Tag size={13} />
          {lead.status || "NEW"}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close lead details"
          className="crm-close-btn"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default LeadSummaryHeader;
