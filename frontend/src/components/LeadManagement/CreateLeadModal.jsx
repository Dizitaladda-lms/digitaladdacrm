import React, { useState } from "react";
import Modal from "../common/Modal/Modal";
import {
  User,
  Phone,
  Mail,
  Building,
  Globe,
  Share2,
  Tag,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ChevronDown,
  GraduationCap,
} from "lucide-react";
import { createLead } from "../../services/leadService";
import "./CreateLeadModal.css";

const DOMAINS = [
  "DizitalAdda",
  "Nidads",
  "Nigape",
  "Nihacs",
  "HackingVidya",
  "IIDAD",
  "Nifase",
  "DesigningVidya",
  "LanguageVidya",
];

const SOURCES = [
  { value: "WHATSAPP", label: "WhatsApp Inquiry" },
  { value: "REFERRAL", label: "Referral / Reference" },
  { value: "WALK_IN", label: "Walk-in / Campus Visit" },
  { value: "CALL", label: "Direct Phone Call" },
  { value: "WEBSITE", label: "Website Form" },
  { value: "META", label: "Meta / Facebook Ads" },
  { value: "GOOGLE", label: "Google Ads" },
  { value: "MANUAL", label: "Other Manual Source" },
];

const POPULAR_COURSES = [
  "Digital Marketing",
  "Cyber Security / Ethical Hacking",
  "Full Stack Web Development",
  "Graphic & UI/UX Design",
  "Data Analytics ",
  "Data Science",
  "Video Editing",
  
];

const BATCH_OPTIONS = [
  "Weekdays Batch (Tuesday - Friday)",
  "Weekend Batch (Saturday - Sunday)",
  "Online Live Interactive Batch",
  "Flexible / Immediate",
];

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

const CreateLeadModal = ({
  open,
  onClose,
  onSuccess,
  employees = [],
  currentUserRole = "ADMIN",
}) => {
  const [formData, setFormData] = useState({
    full_name: "",
    mobile: "",
    alternate_mobile: "",
    email: "",
    education_background: "12th Pass / Appearing",
    source: "WHATSAPP",
    domain: "DizitalAdda",
    interested_course: "Digital Marketing",
    preferred_centre: "Morning Batch (9:00 AM - 12:00 PM)",
    priority: "MEDIUM",
    assigned_to: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.full_name.trim()) {
      setError("Please enter student's full name.");
      return;
    }

    const cleanMobile = formData.mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        full_name: formData.full_name.trim(),
        mobile: cleanMobile,
        alternate_mobile: formData.alternate_mobile.trim() || null,
        email: formData.email.trim() || null,
        education_background: formData.education_background || null,
        source: formData.source,
        domain: formData.domain,
        interested_course: formData.interested_course.trim() || null,
        preferred_centre: formData.preferred_centre.trim() || null,
        priority: formData.priority,
        remarks: formData.remarks.trim() || null,
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
      };

      const res = await createLead(payload);

      setSuccessMsg(
        res?.message ||
          `Lead for ${formData.full_name} captured successfully from ${formData.source}!`
      );

      setTimeout(() => {
        setSuccessMsg("");
        onClose();
        if (typeof onSuccess === "function") {
          onSuccess();
        }
      }, 1200);
    } catch (err) {
      console.error("Create lead error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create lead. Please check details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Create New Lead"
      subtitle="Direct enquiry capture for WhatsApp, Walk-ins, Calls, & Campaigns"
      size="lg"
      onClose={onClose}
      loading={loading}
    >
      <form onSubmit={handleSubmit} className="create-lead-form">
        {error && (
          <div className="create-lead-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="create-lead-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: Student Identity & Contact */}
        <div className="create-lead-section">
          <div className="create-lead-section-header">
            <User size={15} style={{ color: "#2563EB" }} />
            <h4>1. Student Contact & Education</h4>
          </div>

          <div className="create-lead-grid-2">
            {/* Full Name */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Student Full Name <span className="create-lead-required">*</span>
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="create-lead-input"
                />
              </div>
            </div>

            {/* Mobile */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Mobile Number (10 Digits) <span className="create-lead-required">*</span>
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Phone size={15} />
                </span>
                <input
                  type="tel"
                  name="mobile"
                  required
                  maxLength={15}
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="create-lead-input"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Email Address (Optional)
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Mail size={15} />
                </span>
                <input
                  type="text"
                  name="email"
                  placeholder="student@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="create-lead-input"
                />
              </div>
            </div>

            {/* Alternate Phone */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Alternate / Parent Phone
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Phone size={15} />
                </span>
                <input
                  type="tel"
                  name="alternate_mobile"
                  placeholder="Secondary mobile"
                  value={formData.alternate_mobile}
                  onChange={handleChange}
                  className="create-lead-input"
                />
              </div>
            </div>

            {/* Educational Background */}
            <div className="create-lead-field" style={{ gridColumn: "span 2" }}>
              <label className="create-lead-label">
                Educational Background
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <GraduationCap size={15} />
                </span>
                <select
                  name="education_background"
                  value={formData.education_background}
                  onChange={handleChange}
                  className="create-lead-select"
                >
                  {EDUCATION_OPTIONS.map((edu) => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="create-lead-select-chevron" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Course & Batch Preference */}
        <div className="create-lead-section">
          <div className="create-lead-section-header">
            <Building size={15} style={{ color: "#2563EB" }} />
            <h4>2. Course & Batch Preference</h4>
          </div>

          <div className="create-lead-grid-3">
            {/* Interested Course */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Interested Course
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Building size={15} />
                </span>
                <input
                  type="text"
                  list="popular-courses-list"
                  name="interested_course"
                  placeholder="Select or type course..."
                  value={formData.interested_course}
                  onChange={handleChange}
                  className="create-lead-input"
                />
                <datalist id="popular-courses-list">
                  {POPULAR_COURSES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Preferred Batch */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Preferred Batch
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Clock size={15} />
                </span>
                <select
                  name="preferred_centre"
                  value={formData.preferred_centre}
                  onChange={handleChange}
                  className="create-lead-select"
                >
                  {BATCH_OPTIONS.map((batch) => (
                    <option key={batch} value={batch}>
                      {batch}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="create-lead-select-chevron" />
              </div>
            </div>

            {/* Domain / Brand */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Institute Domain <span className="create-lead-required">*</span>
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Globe size={15} />
                </span>
                <select
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  className="create-lead-select"
                >
                  {DOMAINS.map((dom) => (
                    <option key={dom} value={dom}>
                      {dom}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="create-lead-select-chevron" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Source, Priority & Assignment */}
        <div className="create-lead-section">
          <div className="create-lead-section-header">
            <Share2 size={15} style={{ color: "#2563EB" }} />
            <h4>3. Source, Priority & Assignment</h4>
          </div>

          <div className="create-lead-grid-3">
            {/* Lead Source */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Enquiry Source <span className="create-lead-required">*</span>
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Share2 size={15} />
                </span>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="create-lead-select"
                >
                  {SOURCES.map((src) => (
                    <option key={src.value} value={src.value}>
                      {src.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="create-lead-select-chevron" />
              </div>
            </div>

            {/* Priority */}
            <div className="create-lead-field">
              <label className="create-lead-label">
                Lead Priority
              </label>
              <div className="create-lead-input-wrapper">
                <span className="create-lead-icon">
                  <Tag size={15} />
                </span>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="create-lead-select"
                >
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
                <ChevronDown size={15} className="create-lead-select-chevron" />
              </div>
            </div>

            {/* Assign Counsellor */}
            {["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(String(currentUserRole).toUpperCase()) ? (
              <div className="create-lead-field">
                <label className="create-lead-label">
                  Assign Counsellor
                </label>
                <div className="create-lead-input-wrapper">
                  <span className="create-lead-icon">
                    <UserCheck size={15} />
                  </span>
                  <select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    className="create-lead-select"
                  >
                    <option value="">Auto-Assign / Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.designation || "Counsellor"})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="create-lead-select-chevron" />
                </div>
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* Remarks */}
          <div className="create-lead-field" style={{ marginTop: "4px" }}>
            <label className="create-lead-label">
              Inquiry Notes / Remarks (Optional)
            </label>
            <textarea
              name="remarks"
              rows={2}
              placeholder="e.g. Inquired about course fee discount, weekend batch timing..."
              value={formData.remarks}
              onChange={handleChange}
              className="create-lead-textarea"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="create-lead-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="create-lead-btn-cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="create-lead-btn-submit"
          >
            {loading ? "Saving Lead..." : "Save & Add Lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateLeadModal;
