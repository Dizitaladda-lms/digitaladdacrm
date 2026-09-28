import React from "react";
import { Tag, FileText, Lock, Calendar, Clock, DollarSign, Building, AlertTriangle } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * CounsellorNotesTab Component (Guided Counselling)
 * Standardized 5-status lifecycle engine:
 * 1. FOLLOW_UP -> Requires Next Callback Date & Time and Follow-up Channel
 * 2. ENROLLED -> Records Admission Details & Fee Ledger (Total Fee, Paid Fee, Receipt #)
 * 3. WALK_IN -> Walk-in Date/Time & Preferred Centre
 * 4. NOT_INTERESTED -> Reason for dropping
 * 5. INTERESTED -> High-intent student discussion notes
 */
const CounsellorNotesTab = ({
  selectedStatus,
  onStatusSelect,
  feedbackFields = {},
  onFieldChange = () => {},
  remarks,
  onRemarksChange,
  lead,
  isEditable = true,
}) => {
  const normStatus = (selectedStatus || lead?.status || "INTERESTED").toUpperCase();
  const calculatedPriority = ["INTERESTED", "WALK_IN", "WALKIN", "VISITED"].includes(normStatus)
    ? "HIGH"
    : ["FOLLOW_UP", "FOLLOWUP"].includes(normStatus)
    ? "MEDIUM"
    : "LOW";

  const priorityClass =
    calculatedPriority === "HIGH"
      ? "crm-badge-high"
      : calculatedPriority === "MEDIUM"
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
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="WALK_IN">Walkin</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="INTERESTED">Interested</option>
            </select>
          </div>

          {/* Priority Badge (Clean text, no icon) */}
          <div className="crm-field">
            <label className="crm-label">Priority Level (Auto-calculated)</label>
            <div style={{ display: "flex", alignItems: "center", height: "48px" }}>
              <span className={`crm-badge ${priorityClass}`}>
                {calculatedPriority} PRIORITY
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CONDITIONAL ACTION FIELDS BASED ON STATUS */}
        {/* ------------------------------------------------------------- */}

        {/* A. FOLLOW_UP: DATE & TIME SELECTION */}
        {normStatus === "FOLLOW_UP" && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#FFFBEB",
              borderRadius: "12px",
              border: "1px solid #FDE68A",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#92400E" }}>
                Next Follow-up Callback Schedule
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#B45309" }}>
                Konsi date aur time par student ko dobara callback ya message karna hai
              </p>
            </div>

            <div className="crm-grid crm-grid-2">
              <div className="crm-field">
                <label className="crm-label" style={{ color: "#92400E" }}>
                  Next Follow-up Date & Time <span className="crm-required">*</span>
                </label>
                <input
                  type="datetime-local"
                  disabled={!isEditable}
                  value={feedbackFields?.next_followup || ""}
                  onChange={(e) => onFieldChange?.("next_followup", e.target.value)}
                  className="crm-input"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#F59E0B",
                    fontWeight: 600,
                  }}
                  required
                />
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ color: "#92400E" }}>
                  Follow-up Channel / Mode
                </label>
                <select
                  disabled={!isEditable}
                  value={feedbackFields?.followup_type || "CALL"}
                  onChange={(e) => onFieldChange?.("followup_type", e.target.value)}
                  className="crm-select"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#F59E0B" }}
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="MEETING">Campus Visit / Meeting</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* B. ENROLLED: ADMISSION & FEE LEDGER DETAILS */}
        {normStatus === "ENROLLED" && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#F5F3FF",
              borderRadius: "12px",
              border: "1px solid #DDD6FE",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#5B21B6" }}>
                Admission & Fee Ledger Details
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#7C3AED" }}>
                Student admission confirmed. Ye details directly Admissions module me record hongi.
              </p>
            </div>

            <div className="crm-grid crm-grid-2">
              <div className="crm-field">
                <label className="crm-label" style={{ color: "#5B21B6" }}>Course Enrolled</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  placeholder="e.g. Full Stack Web Development"
                  value={
                    feedbackFields?.course_name !== undefined
                      ? feedbackFields.course_name
                      : lead?.interested_course || lead?.course_name || ""
                  }
                  onChange={(e) => onFieldChange?.("course_name", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                />
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ color: "#5B21B6" }}>Total Course Fee (₹)</label>
                <input
                  type="number"
                  disabled={!isEditable}
                  placeholder="e.g. 50000"
                  value={feedbackFields?.total_fee || ""}
                  onChange={(e) => onFieldChange?.("total_fee", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                />
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ color: "#5B21B6" }}>Fee Paid / Token Amount (₹)</label>
                <input
                  type="number"
                  disabled={!isEditable}
                  placeholder="e.g. 15000"
                  value={feedbackFields?.fee_paid || ""}
                  onChange={(e) => onFieldChange?.("fee_paid", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                />
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ color: "#5B21B6" }}>Receipt / Transaction Ref No</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  placeholder="e.g. REC-1024"
                  value={feedbackFields?.receipt_no || ""}
                  onChange={(e) => onFieldChange?.("receipt_no", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                />
              </div>

              <div className="crm-field" style={{ gridColumn: "span 2" }}>
                <label className="crm-label" style={{ color: "#5B21B6" }}>Next Installment Due Date</label>
                <input
                  type="date"
                  disabled={!isEditable}
                  value={feedbackFields?.next_due_date || ""}
                  onChange={(e) => onFieldChange?.("next_due_date", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* C. WALK_IN: CAMPUS VISIT SCHEDULE */}
        {normStatus === "WALK_IN" && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#EFF6FF",
              borderRadius: "12px",
              border: "1px solid #BFDBFE",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#1E40AF" }}>
                Campus Walk-in Schedule
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#2563EB" }}>
                Student ke campus aane ka date, time aur centre schedule karein
              </p>
            </div>

            <div className="crm-grid crm-grid-2">
              <div className="crm-field">
                <label className="crm-label" style={{ color: "#1E40AF" }}>Walk-in Date & Time</label>
                <input
                  type="datetime-local"
                  disabled={!isEditable}
                  value={feedbackFields?.walkin_date || ""}
                  onChange={(e) => onFieldChange?.("walkin_date", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#3B82F6" }}
                />
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ color: "#1E40AF" }}>Preferred Campus / Centre</label>
                <input
                  type="text"
                  disabled={!isEditable}
                  placeholder="e.g. Main Branch"
                  value={feedbackFields?.preferred_centre || lead?.preferred_centre || ""}
                  onChange={(e) => onFieldChange?.("preferred_centre", e.target.value)}
                  className="crm-input"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#3B82F6" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* D. NOT_INTERESTED: REJECTION REASON */}
        {normStatus === "NOT_INTERESTED" && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#FFF1F2",
              borderRadius: "12px",
              border: "1px solid #FECDD3",
            }}
          >
            <div className="crm-field">
              <label className="crm-label" style={{ color: "#9F1239" }}>
                Reason for Not Interested <span className="crm-required">*</span>
              </label>
              <select
                disabled={!isEditable}
                value={feedbackFields?.rejection_reason || ""}
                onChange={(e) => onFieldChange?.("rejection_reason", e.target.value)}
                className="crm-select"
                style={{ backgroundColor: "#FFFFFF", borderColor: "#F43F5E" }}
              >
                <option value="">-- Select Reason --</option>
                <option value="Fee High">Fee High</option>
                <option value="Joined Another Institute">Joined Another Institute</option>
                <option value="Location / Distance Issue">Location / Distance Issue</option>
                <option value="Course Not Available">Course Not Available</option>
                <option value="Not Interested Anymore">Not Interested Anymore</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        )}
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
            rows={5}
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
