import React from "react";
import { Sparkles, Send } from "lucide-react";

/**
 * LeadFeedbackFormCard Component
 * Form section for recording counsellor discussion notes and status updates.
 */
const LeadFeedbackFormCard = ({
  selectedStatus,
  onStatusSelect,
  feedbackFields,
  onFieldChange,
  remarks,
  onRemarksChange,
  onSubmit,
  submitting,
  statusOptions = [],
}) => {
  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <Sparkles className="text-blue-600 shrink-0" size={20} />
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Counsellor Notes & Feedback
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Select lead status to reveal dynamic form fields & record discussion
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Status Dropdown */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 tracking-wider">
            Lead Status <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusSelect?.(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* DYNAMIC FIELDS CONTAINER */}
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 space-y-4">
          {/* 1. FOLLOW_UP */}
          {selectedStatus === "FOLLOW_UP" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Next Follow-up Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={feedbackFields.next_followup || ""}
                  onChange={(e) => onFieldChange("next_followup", e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Follow-up Mode
                </label>
                <select
                  value={feedbackFields.followup_type || "CALL"}
                  onChange={(e) => onFieldChange("followup_type", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">Meeting</option>
                </select>
              </div>
            </div>
          )}

          {/* 2. INTERESTED & WALK_IN */}
          {(selectedStatus === "INTERESTED" || selectedStatus === "WALK_IN" || selectedStatus === "QUALIFIED") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Walk-in Date
                </label>
                <input
                  type="date"
                  value={feedbackFields.walkin_date || ""}
                  onChange={(e) => onFieldChange("walkin_date", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Walk-in Time
                </label>
                <input
                  type="time"
                  value={feedbackFields.walkin_time || ""}
                  onChange={(e) => onFieldChange("walkin_time", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Preferred Centre
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Campus"
                  value={feedbackFields.preferred_centre || ""}
                  onChange={(e) => onFieldChange("preferred_centre", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* 3. ENROLLED */}
          {(selectedStatus === "ENROLLED" || selectedStatus === "ADMISSION_DONE") && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Course Enrolled
                </label>
                <input
                  type="text"
                  placeholder="Course name"
                  value={feedbackFields.course_name || ""}
                  onChange={(e) => onFieldChange("course_name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Fee Paid (₹)
                </label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={feedbackFields.fee_paid || ""}
                  onChange={(e) => onFieldChange("fee_paid", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Receipt / Ref No
                </label>
                <input
                  type="text"
                  placeholder="Receipt #"
                  value={feedbackFields.receipt_no || ""}
                  onChange={(e) => onFieldChange("receipt_no", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* 5. NOT_INTERESTED / REJECTED */}
          {(selectedStatus === "NOT_INTERESTED" || selectedStatus === "LOST" || selectedStatus === "REJECTED") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={feedbackFields.rejection_reason || ""}
                  onChange={(e) => onFieldChange("rejection_reason", e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
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

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 tracking-wider">
                  Joined Competitor (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Institute name"
                  value={feedbackFields.competitor_name || ""}
                  onChange={(e) => onFieldChange("competitor_name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Remarks Textarea */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 tracking-wider">
            Today's Feedback / Discussion Notes
          </label>
          <textarea
            rows={3}
            placeholder="Add today's discussion, counselling notes, or next action..."
            value={remarks}
            onChange={(e) => onRemarksChange?.(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </form>
    </div>
  );
};

export default LeadFeedbackFormCard;
