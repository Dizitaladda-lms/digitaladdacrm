import React from "react";
import { User, Phone, Mail, GraduationCap, Lock } from "lucide-react";
import "./LeadDetailsDrawer.css";

const EDUCATION_OPTIONS = [
  "12th Pass / Appearing",
  "Pursuing Graduation (BCA / B.Tech / BBA / B.Com / BA)",
  "Graduate (Completed Degree)",
  "Postgraduate (MCA / MBA / M.Tech / MA)",
  "10th Pass",
  "Diploma Holder",
  "Working Professional",
  "Other",
];

/**
 * PersonalInformationTab Component (Tab 1)
 * Guided Step 1: Personal Contact & Educational Background
 */
const PersonalInformationTab = ({
  formData,
  onFormChange,
  isEditable = true,
  isLocked = false,
}) => {
  const canEdit = isEditable && !isLocked;

  const handleChange = (field, value) => {
    if (!canEdit) return;
    onFormChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="crm-card">
      {/* Enrolled Lock Banner Notice */}
      {isLocked && (
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
            marginBottom: "16px",
          }}
        >
          <Lock size={18} style={{ color: "#DC2626" }} />
          <span>
            🔒 <strong>Enrolled Student Profile Locked:</strong> Personal details are locked after enrollment to prevent accidental changes. Only fee payments can be updated.
          </span>
        </div>
      )}

      <div className="crm-card-header">
        <User className="text-blue-600" size={20} />
        <div>
          <h3 className="crm-card-title">Personal Contact & Education Details</h3>
          <p className="crm-card-subtitle">
            Student identity, contact numbers, and educational background
          </p>
        </div>
      </div>

      <div className="crm-grid crm-grid-2">
        {/* Full Name */}
        <div className="crm-field">
          <label className="crm-label">
            Full Name <span className="crm-required">*</span>
          </label>
          <div className="crm-input-wrapper">
            <User size={16} className="crm-input-icon" />
            <input
              type="text"
              disabled={!canEdit}
              value={formData.full_name || ""}
              onChange={(e) => handleChange("full_name", e.target.value)}
              placeholder="Enter student full name"
              className="crm-input has-icon"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              required
            />
          </div>
        </div>

        {/* Primary Mobile Number */}
        <div className="crm-field">
          <label className="crm-label">
            Primary Mobile Number <span className="crm-required">*</span>
          </label>
          <div className="crm-input-wrapper">
            <Phone size={16} className="crm-input-icon" />
            <input
              type="text"
              disabled={!canEdit}
              value={formData.mobile || ""}
              onChange={(e) => handleChange("mobile", e.target.value)}
              placeholder="Enter 10-digit mobile number"
              className="crm-input has-icon"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              required
            />
          </div>
        </div>

        {/* Alternate / Parent Mobile */}
        <div className="crm-field">
          <label className="crm-label">Alternate / Parent Mobile</label>
          <div className="crm-input-wrapper">
            <Phone size={16} className="crm-input-icon" />
            <input
              type="text"
              disabled={!canEdit}
              value={formData.alternate_mobile || ""}
              onChange={(e) => handleChange("alternate_mobile", e.target.value)}
              placeholder="Parent / Guardian mobile number"
              className="crm-input has-icon"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="crm-field">
          <label className="crm-label">
            Email Address
          </label>
          <div className="crm-input-wrapper">
            <Mail size={16} className="crm-input-icon" />
            <input
              type="text"
              disabled={!canEdit}
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="student@example.com or any text"
              className="crm-input has-icon"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
            />
          </div>
        </div>

        {/* Educational Background (Replaced City and Country) */}
        <div className="crm-field" style={{ gridColumn: "span 2" }}>
          <label className="crm-label">
            Educational Background
          </label>
          <div className="crm-input-wrapper">
            <GraduationCap size={16} className="crm-input-icon" />
            <select
              disabled={!canEdit}
              value={formData.education_background || "12th Pass / Appearing"}
              onChange={(e) => handleChange("education_background", e.target.value)}
              className="crm-select has-icon"
              style={{
                backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF",
                cursor: !canEdit ? "not-allowed" : "pointer",
                paddingLeft: "36px",
              }}
            >
              <option value="">-- Select Educational Qualification --</option>
              {EDUCATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformationTab;
