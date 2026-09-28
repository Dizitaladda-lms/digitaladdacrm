import React, { useState } from "react";
import { X, CheckCircle2, Calendar, Send, MessageSquare, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { addLeadFeedback } from "../../../services/leadFeedbackService";

/**
 * UpdateFollowupModal Component
 * Allows Counsellor to either Complete Follow-up (Interested, Visited, Enrolled, Not Interested)
 * OR Reschedule Callback for Next Date/Time directly connected to PostgreSQL DB!
 */
const UpdateFollowupModal = ({ followup, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !followup) return null;

  const leadId = followup.lead_id || followup.id;
  const leadName = followup.lead_name || followup.full_name || "Student Lead";

  // Action Mode: "COMPLETE" vs "RESCHEDULE"
  const [actionType, setActionType] = useState("COMPLETE");

  // Complete Outcome: "INTERESTED" | "VISITED" | "ENROLLED" | "NOT_INTERESTED"
  const [outcomeStatus, setOutcomeStatus] = useState("INTERESTED");

  // Reschedule Fields
  const getDefaultTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [nextFollowupAt, setNextFollowupAt] = useState(getDefaultTomorrowDate());
  const [channel, setChannel] = useState("CALL");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (actionType === "COMPLETE") {
        // Complete Follow-up with Selected Outcome Status
        const payload = {
          status: outcomeStatus,
          remarks: remarks.trim() || `Follow-up completed with outcome: ${outcomeStatus}`,
          feedback_fields: {
            followup_id: followup.id,
            completed_action: outcomeStatus,
          },
        };

        await addLeadFeedback(leadId, payload);
        toast.success(`Follow-up completed! Lead status updated to ${outcomeStatus}.`);
      } else {
        // Reschedule Callback for Next Date
        if (!nextFollowupAt) {
          toast.error("Please select next callback date & time.");
          return;
        }

        const payload = {
          status: "FOLLOW_UP",
          next_followup: nextFollowupAt,
          remarks: remarks.trim() || `Call rescheduled for ${new Date(nextFollowupAt).toLocaleString("en-IN")}`,
          feedback_fields: {
            followup_id: followup.id,
            next_followup: nextFollowupAt,
            followup_type: channel,
          },
        };

        await addLeadFeedback(leadId, payload);
        toast.success(`Callback rescheduled for ${new Date(nextFollowupAt).toLocaleDateString("en-IN")}!`);
      }

      if (typeof onSuccess === "function") onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update follow-up:", error);
      toast.error(error?.response?.data?.message || "Failed to update follow-up.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="crm-drawer-backdrop" style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        className="crm-card"
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
              Update Callback Status
            </h3>
            <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
              Student: <strong>{leadName}</strong> ({followup.mobile || "No Mobile"})
            </p>
          </div>
          <button type="button" onClick={onClose} className="crm-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Action Type Selector (Complete vs Reschedule) */}
        <div className="crm-radio-group" style={{ marginBottom: "20px" }}>
          <label
            className="crm-radio-label"
            style={{
              flex: 1,
              backgroundColor: actionType === "COMPLETE" ? "#EFF6FF" : "#F8FAFC",
              borderColor: actionType === "COMPLETE" ? "#2563EB" : "#E2E8F0",
            }}
          >
            <input
              type="radio"
              name="action_type"
              value="COMPLETE"
              checked={actionType === "COMPLETE"}
              onChange={() => setActionType("COMPLETE")}
              className="crm-radio-input"
            />
            <CheckCircle2 size={16} style={{ color: "#16A34A" }} />
            <span>Complete Follow-up</span>
          </label>

          <label
            className="crm-radio-label"
            style={{
              flex: 1,
              backgroundColor: actionType === "RESCHEDULE" ? "#EFF6FF" : "#F8FAFC",
              borderColor: actionType === "RESCHEDULE" ? "#2563EB" : "#E2E8F0",
            }}
          >
            <input
              type="radio"
              name="action_type"
              value="RESCHEDULE"
              checked={actionType === "RESCHEDULE"}
              onChange={() => setActionType("RESCHEDULE")}
              className="crm-radio-input"
            />
            <Calendar size={16} style={{ color: "#2563EB" }} />
            <span>Reschedule for Next Date</span>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="crm-grid" style={{ gap: "16px" }}>
          {/* OPTION A: COMPLETE FOLLOW-UP WITH OUTCOME STATUS */}
          {actionType === "COMPLETE" && (
            <div className="crm-field">
              <label className="crm-label">
                Select Follow-up Outcome Status <span className="crm-required">*</span>
              </label>
              <select
                value={outcomeStatus}
                onChange={(e) => setOutcomeStatus(e.target.value)}
                className="crm-select"
              >
                <option value="INTERESTED">Interested</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="WALK_IN">Walkin</option>
                <option value="ENROLLED">Enrolled</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>
            </div>
          )}

          {/* OPTION B: RESCHEDULE CALLBACK FOR NEXT DATE */}
          {actionType === "RESCHEDULE" && (
            <>
              <div className="crm-field">
                <label className="crm-label">
                  Next Callback Date & Time <span className="crm-required">*</span>
                </label>
                <div className="crm-input-wrapper">
                  <Clock size={16} className="crm-input-icon" />
                  <input
                    type="datetime-local"
                    value={nextFollowupAt}
                    onChange={(e) => setNextFollowupAt(e.target.value)}
                    className="crm-input has-icon"
                    required
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="crm-select"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="MEETING">Campus Meeting</option>
                </select>
              </div>
            </>
          )}

          {/* Discussion Remarks Textarea */}
          <div className="crm-field">
            <label className="crm-label">Discussion Remarks & Summary</label>
            <textarea
              rows={3}
              placeholder={
                actionType === "COMPLETE"
                  ? "Record student response, course interest, parent feedback..."
                  : "Reason for rescheduling (e.g. Phone not answered, asked to call tomorrow)..."
              }
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="crm-textarea"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={onClose} className="crm-btn-secondary" style={{ height: "42px" }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="crm-btn-primary"
              style={{
                height: "42px",
                padding: "0 20px",
                backgroundColor: actionType === "COMPLETE" ? "#16A34A" : "#2563EB",
              }}
            >
              <Send size={16} />
              <span>
                {submitting
                  ? "Saving..."
                  : actionType === "COMPLETE"
                  ? "Complete & Update Status"
                  : "Save Rescheduled Callback"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateFollowupModal;
