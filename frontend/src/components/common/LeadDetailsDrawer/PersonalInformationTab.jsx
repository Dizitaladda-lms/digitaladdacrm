import React from "react";
import { User, Phone, Mail, MapPin, Globe, Lock } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * PersonalInformationTab Component (Tab 1)
 * Guided Step 1: Personal Contact Information
 * Lock protection for enrolled students.
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
          <h3 className="crm-card-title">Step 1: Personal Contact Information</h3>
          <p className="crm-card-subtitle">
            Contact details, alternate parent mobile, and student location
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

        {/* City */}
        <div className="crm-field">
          <label className="crm-label">
            City <span className="crm-required">*</span>
          </label>
          <div className="crm-input-wrapper">
            <MapPin size={16} className="crm-input-icon" />
            <input
              type="text"
              disabled={!canEdit}
              value={formData.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Enter city name"
              className="crm-input has-icon"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              required
            />
          </div>
        </div>

        {/* State */}
        <div className="crm-field">
          <label className="crm-label">
            State <span className="crm-required">*</span>
          </label>
          <select
            disabled={!canEdit}
            value={formData.state || "Uttar Pradesh"}
            onChange={(e) => handleChange("state", e.target.value)}
            className="crm-select"
            style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "pointer" }}
            required
          >
            <option value="">-- Select State --</option>
            <option value="Uttar Pradesh">Uttar Pradesh</option>
            <option value="Delhi">Delhi</option>
            <option value="Haryana">Haryana</option>
            <option value="Bihar">Bihar</option>
            <option value="West Bengal">West Bengal</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Country */}
        <div className="crm-field" style={{ gridColumn: "span 2" }}>
          <label className="crm-label">Country</label>
          <div className="crm-input-wrapper">
            <Globe size={16} className="crm-input-icon" />
            <input
              type="text"
              disabled={!canEdit}
              value={formData.country || "India"}
              onChange={(e) => handleChange("country", e.target.value)}
              placeholder="India"
              className="crm-input has-icon"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformationTab;
