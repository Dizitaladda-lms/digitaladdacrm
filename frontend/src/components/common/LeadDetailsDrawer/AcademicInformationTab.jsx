import React from "react";
import { GraduationCap, School, Target, Share2, Layers, Lock } from "lucide-react";
import "./LeadDetailsDrawer.css";

/**
 * AcademicInformationTab Component (Tab 2)
 * Clean Enterprise Academic Profile & Preferences
 */
const AcademicInformationTab = ({
  formData,
  onFormChange,
  lead,
  isEditable = true,
  isLocked = false,
}) => {
  const canEdit = isEditable && !isLocked;
  const educationType = formData.education_type || "school";

  const handleChange = (field, value) => {
    if (!canEdit) return;
    onFormChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <>
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
            <strong>Enrolled Record Locked:</strong> Academic details and course choice are locked post-enrollment.
          </span>
        </div>
      )}

      {/* Target Program & Centre Preferences Card */}
      <div className="crm-card">
        <div className="crm-card-header">
          <Target className="text-blue-600" size={20} />
          <div>
            <h3 className="crm-card-title">Target Program & Campus Preferences</h3>
            <p className="crm-card-subtitle">Interested course and campus preference</p>
          </div>
        </div>

        <div className="crm-grid crm-grid-2">
          {/* Interested Course */}
          <div className="crm-field">
            <label className="crm-label">
              Interested Program / Course <span className="crm-required">*</span>
            </label>
            <select
              disabled={!canEdit}
              value={formData.interested_course || lead?.interested_course || "BCA"}
              onChange={(e) => handleChange("interested_course", e.target.value)}
              className="crm-select"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "pointer" }}
            >
              <option value="BCA">BCA - Bachelor of Computer Applications</option>
              <option value="BBA">BBA - Bachelor of Business Administration</option>
              <option value="B.Tech">B.Tech - Computer Science & Engineering</option>
              <option value="Event Management">Diploma in Event Management</option>
              <option value="Data Science">Post Graduate Data Science</option>
              <option value="MBA">MBA - Master of Business Administration</option>
            </select>
          </div>

          {/* Preferred Campus Centre */}
          <div className="crm-field">
            <label className="crm-label">Preferred Campus Centre</label>
            <input
              type="text"
              disabled={!canEdit}
              value={formData.preferred_centre || lead?.preferred_centre || ""}
              onChange={(e) => handleChange("preferred_centre", e.target.value)}
              placeholder="e.g. Main Campus / Lucknow"
              className="crm-input"
              style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
            />
          </div>

          {/* Lead Source */}
          <div className="crm-field">
            <label className="crm-label">Lead Source</label>
            <div className="crm-input-wrapper">
              <Share2 size={16} className="crm-input-icon" />
              <input
                type="text"
                disabled
                value={lead?.source || "WEBSITE"}
                className="crm-input has-icon"
                style={{ backgroundColor: "#F1F5F9" }}
              />
            </div>
          </div>

          {/* Campaign */}
          <div className="crm-field">
            <label className="crm-label">Campaign</label>
            <div className="crm-input-wrapper">
              <Layers size={16} className="crm-input-icon" />
              <input
                type="text"
                disabled
                value={lead?.course_name || lead?.campaign_name || "Dizital Adda Admissions 2026"}
                className="crm-input has-icon"
                style={{ backgroundColor: "#F1F5F9" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Academic Background Card */}
      <div className="crm-card">
        <div className="crm-card-header">
          <GraduationCap className="text-blue-600" size={20} />
          <div>
            <h3 className="crm-card-title">Student Academic Background</h3>
            <p className="crm-card-subtitle">Choose education mode (School vs College)</p>
          </div>
        </div>

        {/* Educational Mode Switcher */}
        <div className="crm-radio-group">
          <label className="crm-radio-label">
            <input
              type="radio"
              name="education_type"
              value="school"
              checked={educationType === "school"}
              onChange={() => handleChange("education_type", "school")}
              disabled={!canEdit}
              className="crm-radio-input"
            />
            <School size={16} style={{ color: "#2563EB" }} />
            <span>School Mode (10th / 12th)</span>
          </label>

          <label className="crm-radio-label">
            <input
              type="radio"
              name="education_type"
              value="college"
              checked={educationType === "college"}
              onChange={() => handleChange("education_type", "college")}
              disabled={!canEdit}
              className="crm-radio-input"
            />
            <GraduationCap size={16} style={{ color: "#2563EB" }} />
            <span>College Mode (Degree / Diploma)</span>
          </label>
        </div>

        {/* SCHOOL MODE */}
        {educationType === "school" && (
          <div className="crm-grid crm-grid-3">
            <div className="crm-field" style={{ gridColumn: "1 / -1" }}>
              <label className="crm-label">School Name</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.school_name || ""}
                onChange={(e) => handleChange("school_name", e.target.value)}
                placeholder="e.g. St. Xavier School / City Public School"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">10th Board & Percentage</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.tenth_board_percent || ""}
                onChange={(e) => handleChange("tenth_board_percent", e.target.value)}
                placeholder="e.g. CBSE - 88%"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">12th Board</label>
              <select
                disabled={!canEdit}
                value={formData.board || "CBSE"}
                onChange={(e) => handleChange("board", e.target.value)}
                className="crm-select"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "pointer" }}
              >
                <option value="CBSE">CBSE Board</option>
                <option value="ICSE">ICSE / ISC Board</option>
                <option value="State Board">State Board</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="crm-field">
              <label className="crm-label">12th Stream</label>
              <select
                disabled={!canEdit}
                value={formData.stream || "Science"}
                onChange={(e) => handleChange("stream", e.target.value)}
                className="crm-select"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "pointer" }}
              >
                <option value="Science">Science (PCM/PCB)</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts / Humanities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="crm-field">
              <label className="crm-label">12th Percentage / CGPA</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.percentage_cgpa || ""}
                onChange={(e) => handleChange("percentage_cgpa", e.target.value)}
                placeholder="e.g. 85.6%"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>
          </div>
        )}

        {/* COLLEGE MODE */}
        {educationType === "college" && (
          <div className="crm-grid crm-grid-3">
            <div className="crm-field" style={{ gridColumn: "span 2" }}>
              <label className="crm-label">University / College Name</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.college_name || ""}
                onChange={(e) => handleChange("college_name", e.target.value)}
                placeholder="e.g. Delhi University / DizitalAdda Institute"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Degree Program</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.degree_program || ""}
                onChange={(e) => handleChange("degree_program", e.target.value)}
                placeholder="e.g. B.Sc / BCA / B.Com"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Branch / Specialization</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.specialization || ""}
                onChange={(e) => handleChange("specialization", e.target.value)}
                placeholder="e.g. Computer Science / Finance"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">Passing / Graduation Year</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.graduation_year || "2026"}
                onChange={(e) => handleChange("graduation_year", e.target.value)}
                placeholder="2026"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>

            <div className="crm-field">
              <label className="crm-label">CGPA / Percentage</label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.college_cgpa || ""}
                onChange={(e) => handleChange("college_cgpa", e.target.value)}
                placeholder="e.g. 8.4 CGPA"
                className="crm-input"
                style={{ backgroundColor: !canEdit ? "#F1F5F9" : "#FFFFFF", cursor: !canEdit ? "not-allowed" : "text" }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AcademicInformationTab;
