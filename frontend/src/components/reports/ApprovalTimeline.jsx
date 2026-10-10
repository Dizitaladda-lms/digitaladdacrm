import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  MessageSquare,
} from "lucide-react";

const ROLE_DISPLAY_NAMES = {
  INTERN: "Intern",
  SUB_TL: "Sub-TL",
  TL: "Team Lead (TL)",
  DEPARTMENT_HEAD: "Department Head",
  MANAGER: "Department Head",
  HR: "HR",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_SHORT_NAMES = {
  SUB_TL: "Sub-TL",
  TL: "TL",
  DEPARTMENT_HEAD: "Dept Head",
  MANAGER: "Dept Head",
  HR: "HR",
  SUPER_ADMIN: "Super Admin",
};

/**
 * Fallback chain builder for legacy reports created before `report_approvals` rows existed
 */
const buildFallbackSteps = (report) => {
  if (!report) return [];
  const status = String(report.status || "SUBMITTED").toUpperCase();
  const isRejected = status === "REVISION_REQUESTED" || report.current_status === "REJECTED";
  const tlApproved = ["TL_REVIEWED", "HR_APPROVED", "SUPER_ADMIN_APPROVED"].includes(status);
  const hrApproved = ["HR_APPROVED", "SUPER_ADMIN_APPROVED"].includes(status);
  const saApproved = status === "SUPER_ADMIN_APPROVED";

  return [
    {
      level: 3,
      role_label: "TL",
      approver_name: report.tl_name || "Reporting Manager / TL",
      status: isRejected && !tlApproved ? "REJECTED" : tlApproved ? "APPROVED" : "PENDING",
      is_auto_approved: false,
      remarks: report.tl_feedback || null,
      acted_at: report.tl_reviewed_at || null,
    },
    {
      level: 5,
      role_label: "HR",
      approver_name: report.hr_name || "HR",
      status: hrApproved ? "APPROVED" : "PENDING",
      is_auto_approved: false,
      remarks: report.hr_feedback || null,
      acted_at: report.hr_reviewed_at || null,
    },
    {
      level: 6,
      role_label: "SUPER_ADMIN",
      approver_name: report.super_admin_name || "Super Admin",
      status: saApproved ? "APPROVED" : "PENDING",
      is_auto_approved: false,
      remarks: report.super_admin_feedback || null,
      acted_at: report.super_admin_reviewed_at || null,
    },
  ];
};

const getStepStyle = (step) => {
  const status = String(step.status || "PENDING").toUpperCase();
  if (status === "APPROVED" && step.is_auto_approved) {
    return {
      bg: "#f5f3ff",
      border: "#ddd6fe",
      text: "#6d28d9",
      badgeBg: "#ede9fe",
      icon: <Zap size={12} />,
      statusText: "Approved (by Higher Authority)",
      shortText: "Auto-Approved",
    };
  }
  if (status === "APPROVED") {
    return {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#15803d",
      badgeBg: "#dcfce7",
      icon: <CheckCircle2 size={12} />,
      statusText: "Approved",
      shortText: "Approved",
    };
  }
  if (status === "REJECTED") {
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      text: "#b91c1c",
      badgeBg: "#fee2e2",
      icon: <XCircle size={12} />,
      statusText: "Rejected",
      shortText: "Rejected",
    };
  }
  return {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#b45309",
    badgeBg: "#fef3c7",
    icon: <Clock size={12} />,
    statusText: "Pending",
    shortText: "Pending",
  };
};

const ApprovalTimeline = ({ report, compact = false }) => {
  if (!report) return null;

  const steps =
    Array.isArray(report.approvals) && report.approvals.length > 0
      ? report.approvals
      : buildFallbackSteps(report);

  const nextPendingStep = steps.find(
    (s) => String(s.status || "").toUpperCase() === "PENDING"
  );
  const rejectedStep = steps.find(
    (s) => String(s.status || "").toUpperCase() === "REJECTED"
  );

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {/* Mini Chain Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          {steps.map((step, idx) => {
            const style = getStepStyle(step);
            const shortRole =
              ROLE_SHORT_NAMES[step.role_label] || step.role_label || `L${step.level}`;
            const tooltip = `${ROLE_DISPLAY_NAMES[step.role_label] || step.role_label}: ${
              style.statusText
            }${step.approver_name ? ` (${step.approver_name})` : ""}${
              step.is_auto_approved && step.acted_by_name
                ? ` — Auto-approved by ${step.acted_by_name}`
                : ""
            }${step.remarks ? ` | Note: ${step.remarks}` : ""}`;

            return (
              <React.Fragment key={step.id || `${step.level}-${idx}`}>
                <span
                  title={tooltip}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    background: style.bg,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {style.icon}
                  <span>{shortRole}</span>
                  {step.is_auto_approved && (
                    <span
                      style={{
                        fontSize: "9px",
                        background: "#ddd6fe",
                        color: "#5b21b6",
                        padding: "0 4px",
                        borderRadius: "4px",
                        marginLeft: "2px",
                      }}
                    >
                      Auto
                    </span>
                  )}
                </span>
                {idx < steps.length - 1 && (
                  <ChevronRight size={11} style={{ color: "#94a3b8", flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Current Stage Caption */}
        {rejectedStep ? (
          <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>
            ❌ Rejected by {rejectedStep.acted_by_name || rejectedStep.approver_name || rejectedStep.role_label}
            {rejectedStep.remarks ? `: "${rejectedStep.remarks}"` : ""}
          </span>
        ) : nextPendingStep ? (
          <span style={{ fontSize: "11px", color: "#92400e", fontWeight: 600 }}>
            ⏳ Waiting on:{" "}
            {ROLE_DISPLAY_NAMES[nextPendingStep.role_label] || nextPendingStep.role_label}
            {nextPendingStep.approver_name ? ` (${nextPendingStep.approver_name})` : ""}
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 700 }}>
            ✅ Fully Verified Across Hierarchy
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "16px",
        marginTop: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={17} style={{ color: "#2563eb" }} />
          <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
            Hierarchical Approval Timeline (Step-by-Step Verification)
          </h4>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "999px",
            background: rejectedStep
              ? "#fee2e2"
              : nextPendingStep
              ? "#fef3c7"
              : "#dcfce7",
            color: rejectedStep
              ? "#b91c1c"
              : nextPendingStep
              ? "#b45309"
              : "#15803d",
          }}
        >
          {rejectedStep
            ? "Rejected — Revision Needed"
            : nextPendingStep
            ? `Current Level: ${ROLE_DISPLAY_NAMES[nextPendingStep.role_label] || nextPendingStep.role_label}`
            : "Final Approved"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {steps.map((step, index) => {
          const style = getStepStyle(step);
          const roleTitle =
            ROLE_DISPLAY_NAMES[step.role_label] || step.role_label || `Level ${step.level}`;

          return (
            <div
              key={step.id || `${step.level}-${index}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "10px",
                background: "#ffffff",
                border: `1px solid ${style.border}`,
                borderLeft: `4px solid ${style.text}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#475569",
                      background: "#f1f5f9",
                      padding: "2px 7px",
                      borderRadius: "5px",
                    }}
                  >
                    Step {index + 1} • {roleTitle}
                  </span>
                  <strong style={{ fontSize: "13px", color: "#0f172a", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <UserCheck size={13} style={{ color: "#64748b" }} />
                    {step.approver_name || "Assigned Reviewer"}
                  </strong>
                </div>

                {step.is_auto_approved && (
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "#6d28d9",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "2px",
                    }}
                  >
                    <Zap size={12} />
                    <span>
                      Auto-approved because higher authority (
                      {step.acted_by_name || "Upper Level Authority"}) verified this report directly.
                    </span>
                  </div>
                )}

                {step.remarks && (
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "6px 10px",
                      background: style.bg,
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#334155",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                    }}
                  >
                    <MessageSquare size={12} style={{ marginTop: "2px", flexShrink: 0, color: style.text }} />
                    <span>{step.remarks}</span>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    background: style.badgeBg,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                  }}
                >
                  {style.icon}
                  <span>{style.statusText}</span>
                </span>

                {step.acted_at && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {new Date(step.acted_at).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalTimeline;
