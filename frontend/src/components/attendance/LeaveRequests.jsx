import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Clock3, RefreshCw, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  createLeaveRequest,
  decideLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveApprovals,
} from "../../services/attendanceService";

const today = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const statusLabels = {
  PENDING_DEPARTMENT_HEAD: "Waiting for department head",
  PENDING_HR_APPROVAL: "Waiting for HR",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const statusColors = {
  PENDING_DEPARTMENT_HEAD: ["#fffbeb", "#b45309", "#fde68a"],
  PENDING_HR_APPROVAL: ["#eff6ff", "#1d4ed8", "#bfdbfe"],
  APPROVED: ["#f0fdf4", "#15803d", "#bbf7d0"],
  REJECTED: ["#fef2f2", "#b91c1c", "#fecaca"],
};

const formatDate = (value) =>
  new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const statusBadge = (status) => {
  const [background, color, borderColor] = statusColors[status] || statusColors.PENDING_HR_APPROVAL;
  return (
    <span style={{ background, color, border: `1px solid ${borderColor}`, borderRadius: 999, padding: "4px 9px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {statusLabels[status] || status}
    </span>
  );
};

const LeaveRequests = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const designation = String(user?.designation || "").toLowerCase();
  const canReview = ["HR", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(role)
    || designation.includes("department head")
    || designation.includes("head of department");
  const isHRReviewer = ["HR", "SUPER_ADMIN"].includes(role);
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [form, setForm] = useState({
    leave_type: "PLANNED",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [myRequestsResponse, approvalsResponse] = await Promise.all([
        getMyLeaveRequests(),
        canReview ? getPendingLeaveApprovals() : Promise.resolve({ data: [] }),
      ]);
      setRequests(Array.isArray(myRequestsResponse?.data) ? myRequestsResponse.data : []);
      setApprovals(Array.isArray(approvalsResponse?.data) ? approvalsResponse.data : []);
    } catch (error) {
      console.error("Failed to load leave requests:", error);
      toast.error(error.response?.data?.message || "Could not load leave requests.");
    } finally {
      setLoading(false);
    }
  }, [canReview]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitRequest = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createLeaveRequest(form);
      toast.success(
        form.leave_type === "PLANNED"
          ? "Planned leave sent to your department head for approval."
          : "Urgent leave submitted directly to HR."
      );
      setForm({ leave_type: "PLANNED", start_date: "", end_date: "", reason: "" });
      setShowForm(false);
      await refresh();
    } catch (error) {
      console.error("Failed to submit leave request:", error);
      toast.error(error.response?.data?.message || "Could not submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRequest = async (request, decision) => {
    const reason = decision === "REJECT"
      ? window.prompt(`Reason for rejecting ${request.employee_name || "this"} leave request:`, "")
      : "";
    if (reason === null) return;

    try {
      setActionId(request.id);
      await decideLeaveRequest(request.id, decision, reason);
      toast.success(
        decision === "APPROVE" && request.status === "PENDING_DEPARTMENT_HEAD"
          ? "Approved by department head and forwarded to HR."
          : `Leave request ${decision === "APPROVE" ? "approved" : "rejected"}.`
      );
      await refresh();
    } catch (error) {
      console.error("Failed to review leave request:", error);
      toast.error(error.response?.data?.message || "Could not review leave request.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", margin: "20px 0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: 19, color: "#0f172a" }}>
            <CalendarDays size={19} color="#2563eb" /> Leave Requests
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: "5px 0 0" }}>
            Planned leave needs department head, then HR approval. Urgent leave goes directly to HR.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={refresh} title="Refresh leave requests" style={secondaryButton}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => setShowForm((visible) => !visible)} style={primaryButton}>
            {showForm ? <X size={15} /> : <Send size={14} />} {showForm ? "Close" : "Raise Leave"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submitRequest} style={{ marginTop: 18, padding: 16, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              ["PLANNED", "Planned leave", "For future dates; goes to department head, then HR."],
              ["URGENT", "Urgent leave", "For immediate leave; submit directly to HR."],
            ].map(([value, label, description]) => (
              <label key={value} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", flex: "1 1 240px" }}>
                <input
                  type="radio"
                  name="leave_type"
                  value={value}
                  checked={form.leave_type === value}
                  onChange={(event) => setForm({ ...form, leave_type: event.target.value })}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{label}</strong>
                  <small style={{ color: "#64748b" }}>{description}</small>
                </span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>From date</span>
              <input
                required
                type="date"
                min={form.leave_type === "PLANNED" ? today() : undefined}
                value={form.start_date}
                onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>To date</span>
              <input
                required
                type="date"
                min={form.start_date || (form.leave_type === "PLANNED" ? today() : undefined)}
                value={form.end_date}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ ...fieldStyle, flex: "2 1 300px" }}>
              <span style={fieldLabelStyle}>Reason</span>
              <textarea
                required
                minLength={3}
                maxLength={2000}
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder="Share the reason for your leave"
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>
          </div>
          <button disabled={submitting} type="submit" style={{ ...primaryButton, marginTop: 12, opacity: submitting ? 0.65 : 1 }}>
            <Send size={14} /> {submitting ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
      )}

      {canReview && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 15, color: "#0f172a", margin: "0 0 10px" }}>
            {isHRReviewer ? "Leave approvals for HR" : "Department leave approvals"}
            {approvals.length > 0 && <span style={{ marginLeft: 8, color: "#2563eb" }}>({approvals.length})</span>}
          </h3>
          {approvals.length === 0 && !loading ? (
            <p style={emptyTextStyle}>No leave requests are waiting for your approval.</p>
          ) : approvals.map((request) => (
            <article key={request.id} style={requestCardStyle}>
              <div style={{ flex: "1 1 260px" }}>
                <strong style={{ color: "#0f172a" }}>{request.employee_name || "Employee"}</strong>
                {request.employee_code && <span style={{ marginLeft: 7, color: "#64748b", fontSize: 12 }}>{request.employee_code}</span>}
                <div style={{ marginTop: 5, color: "#475569", fontSize: 13 }}>
                  {request.leave_type === "URGENT" ? "Urgent" : "Planned"} · {formatDate(request.start_date)} – {formatDate(request.end_date)}
                  {request.department_name ? ` · ${request.department_name}` : ""}
                </div>
                <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13, whiteSpace: "pre-wrap" }}>{request.reason}</p>
              </div>
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <button type="button" disabled={actionId === request.id} onClick={() => reviewRequest(request, "APPROVE")} style={approveButton}>
                  <Check size={14} /> Approve
                </button>
                <button type="button" disabled={actionId === request.id} onClick={() => reviewRequest(request, "REJECT")} style={rejectButton}>
                  <X size={14} /> Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 15, color: "#0f172a", margin: "0 0 10px" }}>My leave history</h3>
        {loading ? (
          <p style={emptyTextStyle}><Clock3 size={14} style={{ verticalAlign: "middle", marginRight: 5 }} /> Loading leave requests...</p>
        ) : requests.length === 0 ? (
          <p style={emptyTextStyle}>You have not raised any leave requests.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {requests.map((request) => (
              <article key={request.id} style={requestCardStyle}>
                <div style={{ flex: "1 1 260px" }}>
                  <strong style={{ color: "#0f172a", fontSize: 13 }}>{request.leave_type === "URGENT" ? "Urgent leave" : "Planned leave"}</strong>
                  <div style={{ marginTop: 5, color: "#475569", fontSize: 13 }}>
                    {formatDate(request.start_date)} – {formatDate(request.end_date)}
                  </div>
                  <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13, whiteSpace: "pre-wrap" }}>{request.reason}</p>
                  {request.rejection_reason && <p style={{ margin: "5px 0 0", color: "#b91c1c", fontSize: 12 }}>Review note: {request.rejection_reason}</p>}
                </div>
                {statusBadge(request.status)}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  border: 0,
  borderRadius: 7,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "#f8fafc",
  color: "#334155",
  border: "1px solid #cbd5e1",
};

const fieldStyle = { display: "flex", flexDirection: "column", gap: 5, flex: "1 1 180px" };
const fieldLabelStyle = { color: "#475569", fontWeight: 600, fontSize: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 7, padding: "8px 10px", color: "#0f172a", font: "inherit", background: "#fff" };
const emptyTextStyle = { margin: 0, padding: "12px 14px", border: "1px dashed #cbd5e1", borderRadius: 8, color: "#64748b", fontSize: 13 };
const requestCardStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px" };
const approveButton = { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", padding: "7px 10px", borderRadius: 7, fontWeight: 700, cursor: "pointer" };
const rejectButton = { ...approveButton, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c" };

export default LeaveRequests;
