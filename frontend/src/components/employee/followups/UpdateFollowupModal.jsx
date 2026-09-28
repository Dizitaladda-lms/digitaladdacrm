import React, { useState } from "react";
import {
  X,
  Calendar,
  Send,
  Clock,
  GraduationCap,
  PhoneCall,
  UserCheck,
  XCircle,
  Building2,
  Receipt,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import { addLeadFeedback } from "../../../services/leadFeedbackService";

const UpdateFollowupModal = ({ followup, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !followup) return null;

  const leadId = followup.lead_id || followup.id;
  const leadName = followup.lead_name || followup.full_name || "Student Lead";
  const courseName = followup.interested_course || followup.course_name || "Digital Marketing";

  // Selected Status Outcome (one of the 5 standard project statuses)
  const [selectedStatus, setSelectedStatus] = useState("FOLLOW_UP");

  // Follow-up specific fields
  const getDefaultTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [nextFollowupAt, setNextFollowupAt] = useState(getDefaultTomorrowDate());
  const [channel, setChannel] = useState(followup.followup_type || "CALL");

  // Enrollment / Admission fields
  const [enrollCourse, setEnrollCourse] = useState(courseName);
  const [totalFee, setTotalFee] = useState("");
  const [paidFee, setPaidFee] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");

  // Walk-in fields
  const [walkinDateTime, setWalkinDateTime] = useState(getDefaultTomorrowDate());
  const [preferredCentre, setPreferredCentre] = useState("Main Campus");

  // Not Interested reason
  const [rejectionReason, setRejectionReason] = useState("FEES_HIGH");

  // General remarks
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedStatus === "FOLLOW_UP" && !nextFollowupAt) {
      toast.error("Please select the next callback date & time.");
      return;
    }

    try {
      setSubmitting(true);

      const feedbackFields = {
        followup_id: followup.id,
      };

      if (selectedStatus === "FOLLOW_UP") {
        feedbackFields.next_followup = nextFollowupAt;
        feedbackFields.followup_type = channel;
      } else if (selectedStatus === "ENROLLED") {
        feedbackFields.course_name = enrollCourse || courseName;
        feedbackFields.total_fee = totalFee ? Number(totalFee) : 45000;
        feedbackFields.fee_paid = paidFee ? Number(paidFee) : 10000;
        feedbackFields.receipt_no = receiptNo || `RCP${Date.now().toString().slice(-6)}`;
        feedbackFields.next_due_date = nextDueDate || null;
      } else if (selectedStatus === "WALK_IN") {
        feedbackFields.walkin_date_time = walkinDateTime;
        feedbackFields.preferred_centre = preferredCentre;
      } else if (selectedStatus === "NOT_INTERESTED") {
        feedbackFields.rejection_reason = rejectionReason;
      }

      const payload = {
        status: selectedStatus,
        next_followup: selectedStatus === "FOLLOW_UP" ? nextFollowupAt : null,
        remarks: remarks.trim() || `Call outcome recorded: ${selectedStatus}`,
        feedback_fields: feedbackFields,
      };

      await addLeadFeedback(leadId, payload);

      if (selectedStatus === "ENROLLED") {
        toast.success(`🎉 ${leadName} enrolled! Admission record created with fee details.`);
      } else if (selectedStatus === "FOLLOW_UP") {
        toast.success(`📅 Next callback scheduled for ${new Date(nextFollowupAt).toLocaleString("en-IN")}!`);
      } else if (selectedStatus === "NOT_INTERESTED") {
        toast.success(`Lead marked as Not Interested.`);
      } else {
        toast.success(`Status updated to ${selectedStatus}!`);
      }

      if (typeof onSuccess === "function") onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update follow-up:", error);
      toast.error(error?.response?.data?.message || "Failed to update call status.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="crm-drawer-backdrop"
      style={{
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="crm-card"
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "18px",
            borderBottom: "1px solid #E2E8F0",
            paddingBottom: "14px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
              Update Call / Follow-up Status
            </h3>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "2px 0 0" }}>
              Student: <strong>{leadName}</strong> ({followup.mobile || "No Mobile"}) • {courseName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="crm-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* 1. Quick Outcome Status Chips */}
        <div style={{ marginBottom: "18px" }}>
          <label className="crm-label" style={{ marginBottom: "8px", display: "block" }}>
            Call Result / Action <span className="crm-required">*</span>
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "8px",
            }}
          >
            {[
              {
                id: "FOLLOW_UP",
                label: "Follow Up",
                desc: "Call Later",
                activeBg: "#FFFBEB",
                activeColor: "#D97706",
                activeBorder: "#F59E0B",
              },
              {
                id: "ENROLLED",
                label: "Enrolled",
                desc: "Admission Done",
                activeBg: "#F5F3FF",
                activeColor: "#7C3AED",
                activeBorder: "#8B5CF6",
              },
              {
                id: "WALK_IN",
                label: "Walkin",
                desc: "Campus Visit",
                activeBg: "#EFF6FF",
                activeColor: "#2563EB",
                activeBorder: "#3B82F6",
              },
              {
                id: "INTERESTED",
                label: "Interested",
                desc: "Positive Lead",
                activeBg: "#ECFDF5",
                activeColor: "#059669",
                activeBorder: "#10B981",
              },
              {
                id: "NOT_INTERESTED",
                label: "Not Interested",
                desc: "Rejected",
                activeBg: "#FEF2F2",
                activeColor: "#DC2626",
                activeBorder: "#EF4444",
              },
            ].map((opt) => {
              const isSelected = selectedStatus === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedStatus(opt.id)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: "10px",
                    border: `2px solid ${isSelected ? opt.activeBorder : "#E2E8F0"}`,
                    backgroundColor: isSelected ? opt.activeBg : "#FFFFFF",
                    color: isSelected ? opt.activeColor : "#475569",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "12px", textTransform: "uppercase" }}>
                    {opt.label}
                  </strong>
                  <span style={{ fontSize: "10px", opacity: 0.85 }}>{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Dynamic Conditional Inputs */}
        <form onSubmit={handleSubmit} className="crm-grid" style={{ gap: "14px" }}>
          {/* A. FOLLOW_UP: NEXT DATE & TIME */}
          {selectedStatus === "FOLLOW_UP" && (
            <div
              style={{
                padding: "14px",
                backgroundColor: "#FFFBEB",
                borderRadius: "12px",
                border: "1px solid #FDE68A",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "13px", color: "#92400E" }}>
                  Schedule Next Callback
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#B45309" }}>
                  Student ne jis date & time par dobara call/message karne ko bola hai:
                </p>
              </div>

              <div className="crm-grid crm-grid-2" style={{ gap: "10px" }}>
                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#92400E" }}>
                    Next Callback Date & Time <span className="crm-required">*</span>
                  </label>
                  <div className="crm-input-wrapper">
                    <Clock size={16} className="crm-input-icon" style={{ color: "#D97706" }} />
                    <input
                      type="datetime-local"
                      value={nextFollowupAt}
                      onChange={(e) => setNextFollowupAt(e.target.value)}
                      className="crm-input has-icon"
                      style={{ borderColor: "#F59E0B", backgroundColor: "#FFFFFF" }}
                      required
                    />
                  </div>
                </div>

                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#92400E" }}>
                    Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="crm-select"
                    style={{ borderColor: "#F59E0B", backgroundColor: "#FFFFFF" }}
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

          {/* B. ENROLLED: ADMISSION & FEE DETAILS */}
          {selectedStatus === "ENROLLED" && (
            <div
              style={{
                padding: "14px",
                backgroundColor: "#F5F3FF",
                borderRadius: "12px",
                border: "1px solid #DDD6FE",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "13px", color: "#5B21B6" }}>
                  Confirmed Admission & Fee Record
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#7C3AED" }}>
                  Ye student directly Admissions module me record ho jayega.
                </p>
              </div>

              <div className="crm-grid crm-grid-2" style={{ gap: "10px" }}>
                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#5B21B6" }}>
                    Course Enrolled
                  </label>
                  <input
                    type="text"
                    value={enrollCourse}
                    onChange={(e) => setEnrollCourse(e.target.value)}
                    placeholder="e.g. Digital Marketing / Data Science"
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#5B21B6" }}>
                    Total Course Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    placeholder="e.g. 45000"
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#5B21B6" }}>
                    Paid / Token Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={paidFee}
                    onChange={(e) => setPaidFee(e.target.value)}
                    placeholder="e.g. 15000"
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#5B21B6" }}>
                    Receipt / Transaction Ref No
                  </label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="e.g. RCP-1002"
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                  />
                </div>

                <div className="crm-field" style={{ gridColumn: "span 2" }}>
                  <label className="crm-label" style={{ color: "#5B21B6" }}>
                    Next Installment Due Date (If remaining fee)
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#8B5CF6" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* C. WALK_IN: CAMPUS VISIT */}
          {selectedStatus === "WALK_IN" && (
            <div
              style={{
                padding: "14px",
                backgroundColor: "#EFF6FF",
                borderRadius: "12px",
                border: "1px solid #BFDBFE",
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <strong style={{ fontSize: "13px", color: "#1E40AF" }}>
                  Campus Walk-in Schedule
                </strong>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#3B82F6" }}>
                  Student kis date aur kis centre par visit karne aa raha hai:
                </p>
              </div>

              <div className="crm-grid crm-grid-2" style={{ gap: "10px" }}>
                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#1E40AF" }}>
                    Expected Visit Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={walkinDateTime}
                    onChange={(e) => setWalkinDateTime(e.target.value)}
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#60A5FA" }}
                  />
                </div>

                <div className="crm-field">
                  <label className="crm-label" style={{ color: "#1E40AF" }}>
                    Preferred Centre / Campus
                  </label>
                  <input
                    type="text"
                    value={preferredCentre}
                    onChange={(e) => setPreferredCentre(e.target.value)}
                    placeholder="e.g. Noida Campus / Delhi Centre"
                    className="crm-input"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#60A5FA" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* D. NOT_INTERESTED: REJECTION REASON */}
          {selectedStatus === "NOT_INTERESTED" && (
            <div
              style={{
                padding: "14px",
                backgroundColor: "#FEF2F2",
                borderRadius: "12px",
                border: "1px solid #FECACA",
              }}
            >
              <div className="crm-field">
                <label className="crm-label" style={{ color: "#991B1B" }}>
                  Reason for Not Interested <span className="crm-required">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="crm-select"
                  style={{ backgroundColor: "#FFFFFF", borderColor: "#F87171" }}
                >
                  <option value="FEES_HIGH">Course Fee is Too High</option>
                  <option value="DISTANCE_LOCATION">Centre / Location is Too Far</option>
                  <option value="JOINED_ANOTHER">Already Joined Another Institute</option>
                  <option value="TIMING_ISSUE">Batch Timing Issue</option>
                  <option value="CHANGED_MIND">Not Planning to Learn Now</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>
            </div>
          )}

          {/* Discussion Remarks / Notes */}
          <div className="crm-field">
            <label className="crm-label">Discussion Remarks / Call Notes</label>
            <textarea
              rows={2}
              placeholder="What did the student say on the call? Any questions, parent discussion, or batch timing request..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="crm-textarea"
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "4px",
              borderTop: "1px solid #F1F5F9",
              paddingTop: "14px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="crm-btn-secondary"
              style={{ height: "40px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="crm-btn-primary"
              style={{
                height: "40px",
                padding: "0 18px",
                backgroundColor:
                  selectedStatus === "ENROLLED"
                    ? "#7C3AED"
                    : selectedStatus === "NOT_INTERESTED"
                    ? "#DC2626"
                    : "#2563EB",
              }}
            >
              <Send size={15} />
              <span>{submitting ? "Saving..." : "Confirm & Save Update"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateFollowupModal;
