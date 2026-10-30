import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Home,
  Paperclip,
  RefreshCw,
  Send,
  X,
  Palmtree,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  createLeaveRequest,
  createWfhRequest,
  decideLeaveRequest,
  decideWfhRequest,
  getMyLeaveRequests,
  getMyWfhRequests,
  getLeaveApprovalProof,
  getPendingLeaveApprovals,
  getPendingWfhApprovals,
} from "../../services/attendanceService";

const today = () => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const statusLabels = {
  PENDING_DEPARTMENT_HEAD: "Waiting for department head",
  PENDING_HR_APPROVAL: "Waiting for HR",
  PENDING_HR: "Waiting for HR",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const statusColors = {
  PENDING_DEPARTMENT_HEAD: ["#fffbeb", "#b45309", "#fde68a"],
  PENDING_HR_APPROVAL: ["#eff6ff", "#1d4ed8", "#bfdbfe"],
  PENDING_HR: ["#eff6ff", "#1d4ed8", "#bfdbfe"],
  APPROVED: ["#f0fdf4", "#15803d", "#bbf7d0"],
  REJECTED: ["#fef2f2", "#b91c1c", "#fecaca"],
};

const formatDate = (value) =>
  new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const statusBadge = (status, isWfh = false) => {
  const [background, color, borderColor] = statusColors[status] || statusColors.PENDING_HR;
  const label =
    status === "APPROVED" && isWfh
      ? "Approved (Marked Present)"
      : statusLabels[status] || status;
  return (
    <span
      style={{
        background,
        color,
        border: `1px solid ${borderColor}`,
        borderRadius: 999,
        padding: "4px 9px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};

const LeaveRequests = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const designation = String(user?.designation || "").toLowerCase();
  const canReview =
    ["HR", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(role) ||
    designation.includes("department head") ||
    designation.includes("head of department");
  const isHRReviewer = ["HR", "SUPER_ADMIN", "ADMIN"].includes(role);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [leaveApprovals, setLeaveApprovals] = useState([]);
  const [wfhApprovals, setWfhApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL | LEAVE | WFH

  const [form, setForm] = useState({
    request_type: "WFH", // WFH | PLANNED | URGENT
    start_date: today(),
    end_date: today(),
    reason: "",
    manager_approval_proof: null,
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [myLeavesRes, myWfhRes, leaveApprRes, wfhApprRes] = await Promise.all([
        getMyLeaveRequests().catch(() => ({ data: [] })),
        getMyWfhRequests().catch(() => ({ data: [] })),
        canReview ? getPendingLeaveApprovals().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isHRReviewer ? getPendingWfhApprovals().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      setLeaveRequests(Array.isArray(myLeavesRes?.data) ? myLeavesRes.data : []);
      setWfhRequests(Array.isArray(myWfhRes?.data) ? myWfhRes.data : []);
      setLeaveApprovals(Array.isArray(leaveApprRes?.data) ? leaveApprRes.data : []);
      setWfhApprovals(Array.isArray(wfhApprRes?.data) ? wfhApprRes.data : []);
    } catch (error) {
      console.error("Failed to load requests:", error);
      toast.error(error.response?.data?.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [canReview, isHRReviewer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitRequest = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);

      if (form.request_type === "WFH") {
        await createWfhRequest({
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason,
        });
        toast.success("WFH request submitted directly to HR. Once approved, you will be marked as Present.");
      } else {
        await createLeaveRequest({
          leave_type: form.request_type,
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason,
          manager_approval_proof: form.manager_approval_proof,
        });
        toast.success(
          form.request_type === "PLANNED"
            ? "Planned leave sent to your department head for approval."
            : "Urgent leave submitted directly to HR."
        );
      }

      setForm({
        request_type: "WFH",
        start_date: today(),
        end_date: today(),
        reason: "",
        manager_approval_proof: null,
      });
      setShowForm(false);
      await refresh();
    } catch (error) {
      console.error("Failed to submit request:", error);
      toast.error(error.response?.data?.message || "Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewLeave = async (request, decision) => {
    const reason =
      decision === "REJECT"
        ? window.prompt(`Reason for rejecting ${request.employee_name || "this"} leave request:`, "")
        : "";
    if (reason === null) return;

    try {
      setActionId(`leave-${request.id}`);
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

  const reviewWfh = async (request, decision) => {
    const reason =
      decision === "REJECT"
        ? window.prompt(`Reason for rejecting ${request.employee_name || "this"} WFH request:`, "")
        : "";
    if (reason === null) return;

    try {
      setActionId(`wfh-${request.id}`);
      await decideWfhRequest(request.id, decision, reason);
      toast.success(
        decision === "APPROVE"
          ? `WFH request approved! Employee is marked as Present (WFH).`
          : `WFH request rejected.`
      );
      await refresh();
    } catch (error) {
      console.error("Failed to review WFH request:", error);
      toast.error(error.response?.data?.message || "Could not review WFH request.");
    } finally {
      setActionId(null);
    }
  };

  const openApprovalProof = async (request) => {
    try {
      const response = await getLeaveApprovalProof(request.id);
      const accessUrl = response?.data?.access_url;
      if (!accessUrl) throw new Error("No screenshot URL returned");
      window.open(accessUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not open the approval screenshot.");
    }
  };

  // Merge and sort all personal requests
  const allPersonalRequests = [
    ...wfhRequests.map((r) => ({ ...r, is_wfh: true })),
    ...leaveRequests.map((r) => ({ ...r, is_wfh: false })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredPersonalRequests = allPersonalRequests.filter((r) => {
    if (activeFilter === "WFH") return r.is_wfh;
    if (activeFilter === "LEAVE") return !r.is_wfh;
    return true;
  });

  const totalPendingApprovals = leaveApprovals.length + wfhApprovals.length;

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "20px 24px",
        margin: "20px 0",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: 19, color: "#0f172a" }}>
            <CalendarDays size={19} color="#2563eb" /> Leave & Work From Home (WFH) Requests
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: "5px 0 0" }}>
            Apply for Work From Home (WFH) or Leaves. Approved WFH counts directly towards Present attendance.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={refresh} title="Refresh requests" style={secondaryButton}>
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => setShowForm((visible) => !visible)} style={primaryButton}>
            {showForm ? <X size={15} /> : <Send size={14} />} {showForm ? "Close Form" : "Apply WFH / Leave"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={submitRequest}
          style={{ marginTop: 18, padding: 18, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              ["WFH", "🏠 Work From Home (WFH)", "Direct to HR approval. Counts as Present in attendance once approved."],
              ["PLANNED", "🌴 Planned Leave", "For future dates; requires department head, then HR approval."],
              ["URGENT", "🚨 Urgent Leave", "For immediate personal/medical leave; submitted directly to HR."],
            ].map(([value, label, description]) => (
              <label
                key={value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  cursor: "pointer",
                  flex: "1 1 240px",
                  background: form.request_type === value ? "#eff6ff" : "#ffffff",
                  border: `1.5px solid ${form.request_type === value ? "#2563eb" : "#cbd5e1"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <input
                  type="radio"
                  name="request_type"
                  value={value}
                  checked={form.request_type === value}
                  onChange={(event) => setForm({ ...form, request_type: event.target.value })}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>{label}</strong>
                  <small style={{ color: "#64748b", fontSize: "11.5px" }}>{description}</small>
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
                min={form.request_type === "PLANNED" ? today() : undefined}
                value={form.start_date}
                onChange={(event) =>
                  setForm({
                    ...form,
                    start_date: event.target.value,
                    end_date: form.end_date < event.target.value ? event.target.value : form.end_date,
                  })
                }
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>To date</span>
              <input
                required
                type="date"
                min={form.start_date || (form.request_type === "PLANNED" ? today() : undefined)}
                value={form.end_date}
                onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                style={inputStyle}
              />
            </label>
            <label style={{ ...fieldStyle, flex: "2 1 300px" }}>
              <span style={fieldLabelStyle}>
                Reason {form.request_type === "WFH" ? "for WFH" : "for leave"}
              </span>
              <textarea
                required
                minLength={3}
                maxLength={2000}
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder={
                  form.request_type === "WFH"
                    ? "Explain why you are requesting Work From Home (e.g. personal task, client visits, health recovery, etc.)"
                    : "Share the reason for your leave"
                }
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>
          </div>

          {form.request_type !== "WFH" && (
            <label style={{ ...fieldStyle, marginTop: 12 }}>
              <span style={fieldLabelStyle}>
                Manager WhatsApp approval screenshot <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    toast.error("Screenshot must be 5 MB or smaller.");
                    event.target.value = "";
                    return;
                  }
                  setForm((current) => ({ ...current, manager_approval_proof: file }));
                }}
                style={inputStyle}
              />
              <small style={{ color: "#64748b" }}>
                <Paperclip size={12} style={{ verticalAlign: "-2px" }} /> Attach manager&apos;s WhatsApp approval if available. JPG, PNG or WEBP, up to 5 MB.
                {form.manager_approval_proof ? ` Selected: ${form.manager_approval_proof.name}` : ""}
              </small>
            </label>
          )}

          <button
            disabled={submitting}
            type="submit"
            style={{ ...primaryButton, marginTop: 14, opacity: submitting ? 0.65 : 1 }}
          >
            <Send size={14} />{" "}
            {submitting
              ? "Submitting..."
              : form.request_type === "WFH"
              ? "Submit WFH Request"
              : "Submit Leave Request"}
          </button>
        </form>
      )}

      {/* Review Section for Department Head & HR */}
      {canReview && (
        <div style={{ marginTop: 22, borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
          <h3 style={{ fontSize: 15, color: "#0f172a", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
            Pending Team Approvals
            {totalPendingApprovals > 0 && (
              <span style={{ marginLeft: 4, background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                {totalPendingApprovals}
              </span>
            )}
          </h3>

          {totalPendingApprovals === 0 && !loading ? (
            <p style={emptyTextStyle}>No pending leave or WFH requests are waiting for your review.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {/* 1. Pending WFH Approvals (HR / Super Admin) */}
              {wfhApprovals.map((request) => (
                <article
                  key={`wfh-appr-${request.id}`}
                  style={{ ...requestCardStyle, borderLeft: "4px solid #0d9488", background: "#f0fdfa" }}
                >
                  <div style={{ flex: "1 1 260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ background: "#ccfbf1", color: "#0f766e", border: "1px solid #99f6e4", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                        🏠 WFH Request
                      </span>
                      <strong style={{ color: "#0f172a" }}>{request.employee_name || "Employee"}</strong>
                      {request.employee_code && (
                        <span style={{ color: "#64748b", fontSize: 12 }}>({request.employee_code})</span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>
                      Dates: <strong>{formatDate(request.start_date)}</strong>
                      {request.start_date !== request.end_date && ` → ${formatDate(request.end_date)}`}
                      {request.department_name ? ` · ${request.department_name}` : ""}
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13, whiteSpace: "pre-wrap" }}>
                      Reason: {request.reason}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={actionId === `wfh-${request.id}`}
                      onClick={() => reviewWfh(request, "APPROVE")}
                      style={approveButton}
                    >
                      <Check size={14} /> Approve (Mark Present)
                    </button>
                    <button
                      type="button"
                      disabled={actionId === `wfh-${request.id}`}
                      onClick={() => reviewWfh(request, "REJECT")}
                      style={rejectButton}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </article>
              ))}

              {/* 2. Pending Leave Approvals */}
              {leaveApprovals.map((request) => (
                <article
                  key={`leave-appr-${request.id}`}
                  style={{ ...requestCardStyle, borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}
                >
                  <div style={{ flex: "1 1 260px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>
                        🌴 {request.leave_type === "URGENT" ? "Urgent Leave" : "Planned Leave"}
                      </span>
                      <strong style={{ color: "#0f172a" }}>{request.employee_name || "Employee"}</strong>
                      {request.employee_code && (
                        <span style={{ color: "#64748b", fontSize: 12 }}>({request.employee_code})</span>
                      )}
                    </div>
                    <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>
                      Dates: <strong>{formatDate(request.start_date)}</strong>
                      {request.start_date !== request.end_date && ` → ${formatDate(request.end_date)}`}
                      {request.department_name ? ` · ${request.department_name}` : ""}
                    </div>
                    <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13, whiteSpace: "pre-wrap" }}>
                      Reason: {request.reason}
                    </p>
                    {request.manager_approval_proof_public_id && (
                      <button type="button" onClick={() => openApprovalProof(request)} style={proofButton}>
                        <Paperclip size={13} /> View WhatsApp approval
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={actionId === `leave-${request.id}`}
                      onClick={() => reviewLeave(request, "APPROVE")}
                      style={approveButton}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={actionId === `leave-${request.id}`}
                      onClick={() => reviewLeave(request, "REJECT")}
                      style={rejectButton}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Personal Requests History */}
      <div style={{ marginTop: 24, borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, color: "#0f172a", margin: 0 }}>My Request History</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              ["ALL", `All (${allPersonalRequests.length})`],
              ["WFH", `🏠 WFH (${wfhRequests.length})`],
              ["LEAVE", `🌴 Leaves (${leaveRequests.length})`],
            ].map(([filterKey, label]) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setActiveFilter(filterKey)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: activeFilter === filterKey ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: activeFilter === filterKey ? "#eff6ff" : "#ffffff",
                  color: activeFilter === filterKey ? "#1d4ed8" : "#64748b",
                  fontWeight: activeFilter === filterKey ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={emptyTextStyle}>
            <Clock3 size={14} style={{ verticalAlign: "middle", marginRight: 5 }} /> Loading requests...
          </p>
        ) : filteredPersonalRequests.length === 0 ? (
          <p style={emptyTextStyle}>You have not submitted any {activeFilter === "WFH" ? "WFH" : activeFilter === "LEAVE" ? "leave" : ""} requests.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {filteredPersonalRequests.map((request) => (
              <article
                key={request.is_wfh ? `my-wfh-${request.id}` : `my-leave-${request.id}`}
                style={{
                  ...requestCardStyle,
                  borderLeft: request.is_wfh ? "4px solid #0d9488" : "4px solid #3b82f6",
                }}
              >
                <div style={{ flex: "1 1 260px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ color: "#0f172a", fontSize: 13 }}>
                      {request.is_wfh
                        ? "🏠 Work From Home (WFH)"
                        : request.leave_type === "URGENT"
                        ? "🚨 Urgent Leave"
                        : "🌴 Planned Leave"}
                    </strong>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      ({formatDate(request.start_date)}
                      {request.start_date !== request.end_date && ` → ${formatDate(request.end_date)}`})
                    </span>
                  </div>

                  <p style={{ margin: "5px 0 0", color: "#475569", fontSize: 13, whiteSpace: "pre-wrap" }}>
                    {request.reason}
                  </p>

                  {!request.is_wfh && request.manager_approval_proof_public_id && (
                    <button type="button" onClick={() => openApprovalProof(request)} style={proofButton}>
                      <Paperclip size={13} /> View WhatsApp approval
                    </button>
                  )}

                  {request.rejection_reason && (
                    <p style={{ margin: "5px 0 0", color: "#b91c1c", fontSize: 12 }}>
                      Review note: {request.rejection_reason}
                    </p>
                  )}
                </div>
                {statusBadge(request.status, request.is_wfh)}
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
  padding: "8px 14px",
  border: 0,
  borderRadius: 8,
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
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 7,
  padding: "8px 10px",
  color: "#0f172a",
  font: "inherit",
  background: "#fff",
};
const emptyTextStyle = {
  margin: 0,
  padding: "12px 14px",
  border: "1px dashed #cbd5e1",
  borderRadius: 8,
  color: "#64748b",
  fontSize: 13,
};
const requestCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "12px 14px",
  background: "#fff",
};
const approveButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#15803d",
  padding: "7px 12px",
  borderRadius: 7,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 12.5,
};
const rejectButton = {
  ...approveButton,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
};
const proofButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  marginTop: 8,
  border: 0,
  background: "transparent",
  color: "#2563eb",
  padding: 0,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

export default LeaveRequests;
