import React from "react";
import { Tag, AlertCircle, FileText, Lock } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * CounsellorNotesTab Component (Guided Counselling)
 * Streamlined: Only Lead Status & Remarks as requested.
 * Full audit history and notes remain in the Audit Timeline tab.
 */
const CounsellorNotesTab = ({
  selectedStatus,
  onStatusSelect,
  remarks,
  onRemarksChange,
  lead,
  isEditable = true,
}) => {
  const normStatus = (selectedStatus || lead?.status || "NEW").toUpperCase();
  const rawPriority = (lead?.priority || "MEDIUM").toUpperCase();
  const priorityClass =
    rawPriority === "HIGH"
      ? "crm-badge-high"
      : rawPriority === "MEDIUM"
      ? "crm-badge-medium"
      : "crm-badge-low";

  const isEnrolledLocked = !isEditable;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Enrolled Lock Banner Notice */}
      {isEnrolledLocked && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#FEF2F2",
            borderRadius: "10px",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Lock size={18} style={{ color: "#DC2626" }} />
          <span>
            <strong>Enrolled Lead Locked:</strong> Student admission is confirmed. Status and details are preserved.
          </span>
        </div>
      )}

      {/* 1. Lead Status & Priority Card */}
      <div className="crm-card">
        <div className="crm-card-header">
          <Tag className="text-blue-600" size={20} />
          <div>
            <h3 className="crm-card-title">Lead Status & Priority</h3>
            <p className="crm-card-subtitle">
              Update student intent and lifecycle status
            </p>
          </div>
        </div>

        <div className="crm-grid crm-grid-2">
          {/* Status Selector */}
          <div className="crm-field">
            <label className="crm-label">
              Lead Status <span className="crm-required">*</span>
            </label>
            <select
              disabled={!isEditable}
              value={normStatus}
              onChange={(e) => onStatusSelect(e.target.value)}
              className="crm-select"
              style={{
                backgroundColor: !isEditable ? "#F1F5F9" : "#FFFFFF",
                cursor: !isEditable ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <option value="NEW">NEW (Fresh Uncontacted Lead)</option>
              <option value="INTERESTED">INTERESTED (High Intent)</option>
              <option value="FOLLOW_UP">FOLLOW_UP (Follow-up / In Discussion)</option>
              <option value="VISITED">VISITED (Campus Visited)</option>
              <option value="ENROLLED">ENROLLED (Admission Confirmed)</option>
              <option value="NOT_INTERESTED">NOT_INTERESTED (Lost / Dropped)</option>
            </select>
          </div>

          {/* Priority Badge */}
          <div className="crm-field">
            <label className="crm-label">Priority Level</label>
            <div style={{ display: "flex", alignItems: "center", height: "48px" }}>
              <span className={`crm-badge ${priorityClass}`}>
                <AlertCircle size={14} />
                {rawPriority} PRIORITY
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Counsellor Remarks & Discussion Notes Card */}
      <div className="crm-card">
        <div className="crm-card-header">
          <FileText className="text-blue-600" size={20} />
          <div>
            <h3 className="crm-card-title">Counsellor Remarks & Discussion Summary</h3>
            <p className="crm-card-subtitle">
              Record conversation notes, student feedback, and action points
            </p>
          </div>
        </div>

        <div className="crm-field">
          <label className="crm-label">Remarks / Discussion Notes</label>
          <textarea
            rows={6}
            disabled={!isEditable}
            placeholder="Type discussion notes, student preferences, questions asked on call, next steps..."
            value={remarks !== undefined ? remarks : (lead?.remarks || "")}
            onChange={(e) => onRemarksChange(e.target.value)}
            className="crm-textarea"
            style={{
              backgroundColor: !isEditable ? "#F1F5F9" : "#FFFFFF",
              cursor: !isEditable ? "not-allowed" : "text",
              lineHeight: 1.6,
              fontSize: "13.5px",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CounsellorNotesTab;
