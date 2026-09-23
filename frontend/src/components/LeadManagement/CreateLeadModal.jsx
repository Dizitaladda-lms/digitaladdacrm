import React, { useState } from "react";
import Modal from "../common/Modal/Modal";
import { User, Phone, Mail, Building, Globe, Share2, Tag, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { createLead } from "../../services/leadService";

const DOMAINS = [
  "DizitalAdda",
  "Nidads",
  "Nigape",
  "Nihacs",
  "HackingVidya",
  "IIDAD",
  "Nifase",
  "DesigningVidya",
  "LanguageVidya"
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
  "Data Analytics / Data Science",
  "Python Programming",
  "Video Editing",
  "BCA / MCA"
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
    source: "WHATSAPP",
    domain: "DizitalAdda",
    interested_course: "Digital Marketing",
    preferred_centre: "Online",
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
      title="Create Manual Lead"
      subtitle="Add enquiry from WhatsApp, Referral, Direct Call, or Campus Walk-in."
      size="lg"
      onClose={onClose}
      loading={loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 border border-red-200">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Student Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User size={16} />
              </div>
              <input
                type="text"
                name="full_name"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Mobile Number (10 Digits) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                name="mobile"
                required
                maxLength={15}
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lead Source */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Enquiry Source <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Share2 size={16} />
              </div>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {SOURCES.map((src) => (
                  <option key={src.value} value={src.value}>
                    {src.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Domain / Brand */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Domain / Brand <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Globe size={16} />
              </div>
              <select
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DOMAINS.map((dom) => (
                  <option key={dom} value={dom}>
                    {dom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email Address (Optional)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                name="email"
                placeholder="e.g. student@gmail.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Alternate Mobile */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Alternate Phone (Optional)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                name="alternate_mobile"
                placeholder="Parent / Secondary mobile"
                value={formData.alternate_mobile}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Interested Course */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Interested Course
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Building size={16} />
              </div>
              <input
                type="text"
                list="popular-courses-list"
                name="interested_course"
                placeholder="e.g. Digital Marketing"
                value={formData.interested_course}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <datalist id="popular-courses-list">
                {POPULAR_COURSES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Preferred Centre / Campus */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Campus / Centre
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Building size={16} />
              </div>
              <select
                name="preferred_centre"
                value={formData.preferred_centre}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Online">Online Batch</option>
                <option value="Janakpuri">Janakpuri Campus</option>
                <option value="Pitampura">Pitampura Campus</option>
                <option value="Laxmi Nagar">Laxmi Nagar Campus</option>
                <option value="Noida">Noida Campus</option>
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Lead Priority
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Tag size={16} />
              </div>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="HIGH">High Priority 🔥</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Assign To (for Admin) */}
          {currentUserRole === "ADMIN" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Assign To Counsellor (Optional)
              </label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Auto-Assign / Keep Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.designation || "Counsellor"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Remarks / Reference Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Reference / Inquiry Remarks
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute top-3 left-3 text-slate-400">
              <FileText size={16} />
            </div>
            <textarea
              name="remarks"
              rows={2}
              placeholder="e.g. Referred by friend Aman; student inquired on WhatsApp regarding syllabus and fees..."
              value={formData.remarks}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving Lead..." : "Save & Add Lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateLeadModal;
