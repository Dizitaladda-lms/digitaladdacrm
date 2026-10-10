import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Calendar,
  Clock,
  Video,
  CheckCircle,
  AlertCircle,
  Filter,
  Eye,
  CheckCheck,
  Search,
  ShieldCheck,
  Crown,
  Briefcase,
  GraduationCap,
  Building2,
  RefreshCw,
  Layers,
  Zap,
  UserCheck,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getTeamReports,
  getPendingForMeReports,
  getReportVisibility,
  approveReport,
  rejectReport,
} from "../../services/reportService";
import { getDepartments } from "../../services/departmentService";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import ApprovalTimeline from "../../components/reports/ApprovalTimeline";
import { useAuth } from "../../context/AuthContext";
import { formatWorkHours } from "../../utils/shiftTiming";
import "./TeamReports.css";

const SIX_OFFICIAL_DEPARTMENTS = [
  "Performance Marketing",
  "SEO and Search AI",
  "Operations & Administration",
  "Graphics Design & Video Editing",
  "Tech and Web Development",
  "Digital Marketing Agency",
];

const TeamReports = () => {
  const { user } = useAuth();
  const userRole = String(user?.role || "").toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isHR = userRole === "HR" || isSuperAdmin;
  const isDepartmentHead =
    userRole === "DEPARTMENT_HEAD" ||
    userRole === "MANAGER" ||
    /department head|head of department/i.test(String(user?.designation || ""));
  const isSubTL =
    userRole === "SUB_TL" ||
    /sub[- ]?team lead|sub[- ]?tl/i.test(String(user?.designation || ""));
  const canSeeBottleneckOwner = isHR || userRole === "ADMIN" || isDepartmentHead;
  const isTL =
    userRole === "TL" ||
    isSubTL ||
    isDepartmentHead ||
    (user?.designation && /team lead|leader|head|manager/i.test(user.designation));

  const [viewMode, setViewMode] = useState("TEAM"); // "TEAM" | "PENDING_FOR_ME"
  const [departments, setDepartments] = useState([]);
  const [reportScope, setReportScope] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedRoleLevel, setSelectedRoleLevel] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedUserId, setSelectedUserId] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => (
    canSeeBottleneckOwner ? "" : new Date().toISOString().split("T")[0]
  ));
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportPagination, setReportPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Review Modal State
  const [reviewingReport, setReviewingReport] = useState(null);
  const [reviewType, setReviewType] = useState("TL"); // "TL" | "HR" | "SUPER_ADMIN"
  const [reviewDecision, setReviewDecision] = useState("APPROVE"); // "APPROVE" | "REVISE"
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  // Load active departments list from backend
  useEffect(() => {
    getDepartments()
      .then((res) => {
        if (res?.data) {
          setDepartments(res.data);
        }
      })
      .catch((err) => console.error("Failed to load departments:", err));
  }, []);

  useEffect(() => {
    getReportVisibility()
      .then((res) => setReportScope(res?.data || null))
      .catch((err) => {
        console.error("Failed to load report visibility scope:", err);
        toast.error(err.response?.data?.message || "Could not load report access scope.");
      });
  }, []);

  // Allowed department IDs for non-HR / TL
  const allowedDepartmentIds = useMemo(() => {
    if (isHR) return null; // Super Admin and HR see everything
    const primaryId = user?.department_id ? Number(user.department_id) : null;
    let managed = [];
    if (Array.isArray(user?.managed_department_ids)) {
      managed = user.managed_department_ids.map(Number).filter(Boolean);
    } else if (typeof user?.managed_department_ids === "string") {
      try {
        managed = JSON.parse(user.managed_department_ids).map(Number).filter(Boolean);
      } catch (e) {
        managed = [];
      }
    }
    return Array.from(new Set([...(primaryId ? [primaryId] : []), ...managed]));
  }, [isHR, user?.department_id, user?.managed_department_ids]);

  // Visible departments list for filter tabs (strictly limited for TLs)
  const visibleDepartments = useMemo(() => {
    if (reportScope && !reportScope.unrestricted) {
      const allowedIds = new Set((reportScope.departmentIds || []).map(Number));
      return departments.filter((department) => allowedIds.has(Number(department.id)));
    }
    if (isHR) {
      if (departments.length > 0) return departments;
      return SIX_OFFICIAL_DEPARTMENTS.map((name, idx) => ({ id: idx + 1, department_name: name }));
    }

    if (departments.length > 0 && allowedDepartmentIds && allowedDepartmentIds.length > 0) {
      const matched = departments.filter((d) => allowedDepartmentIds.includes(Number(d.id)));
      if (matched.length > 0) return matched;
    }

    // Fallback: if user has department_name
    if (user?.department_name) {
      return [{
        id: user.department_id || 1,
        department_name: user.department_name,
      }];
    }

    return [];
  }, [isHR, departments, allowedDepartmentIds, user?.department_name, user?.department_id, reportScope]);

  // Synchronize initial selectedDepartment for TL
  useEffect(() => {
    if (!isHR && visibleDepartments.length > 0) {
      if (visibleDepartments.length === 1) {
        setSelectedDepartment(visibleDepartments[0].id);
      } else if (
        selectedDepartment !== "ALL" &&
        !visibleDepartments.some(
          (d) => String(d.id) === String(selectedDepartment) || d.department_name === selectedDepartment
        )
      ) {
        setSelectedDepartment(visibleDepartments[0].id);
      }
    }
  }, [isHR, visibleDepartments, selectedDepartment]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      let deptParam = undefined;
      if (selectedDepartment !== "ALL") {
        deptParam = selectedDepartment;
      } else if (!isHR && visibleDepartments.length === 1) {
        deptParam = visibleDepartments[0].id;
      }

      if (viewMode === "PENDING_FOR_ME") {
        const res = await getPendingForMeReports({
          departmentId: deptParam,
          date: selectedDate || undefined,
          search: searchTerm || undefined,
          page: reportPage,
          limit: 100,
        });
        setReports(Array.isArray(res?.data?.reports) ? res.data.reports : []);
        setReportPagination(res?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      } else {
        const res = await getTeamReports({
          departmentId: deptParam,
          roleType: selectedRoleLevel !== "ALL" ? selectedRoleLevel : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
          userId: selectedUserId !== "ALL" ? selectedUserId : undefined,
          verifiedOnly: verifiedOnly ? "true" : undefined,
          date: selectedDate || undefined,
          search: searchTerm || undefined,
          page: reportPage,
          limit: 100,
        });
        setReports(Array.isArray(res?.data?.reports) ? res.data.reports : []);
        setReportPagination(res?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch team reports:", err);
      toast.error(err.response?.data?.message || "Could not fetch team reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [viewMode, selectedDepartment, selectedRoleLevel, selectedStatus, selectedUserId, verifiedOnly, selectedDate, searchTerm, reportPage]);

  // Distinct users list for Super Admin / Manager User filter
  const submitterUsers = useMemo(() => {
    const map = new Map();
    for (const r of reports) {
      if (r.user_id && r.user_name) {
        map.set(Number(r.user_id), { id: Number(r.user_id), name: r.user_name });
      }
    }
    return Array.from(map.values());
  }, [reports]);

  // Open review modal with appropriate role target
  const handleOpenReview = (report, targetRole = null) => {
    setReviewingReport(report);
    setReviewFeedback("");
    setReviewDecision("APPROVE");

    if (targetRole) {
      setReviewType(targetRole);
    } else if (isSuperAdmin) {
      setReviewType("SUPER_ADMIN");
    } else if (isHR) {
      setReviewType("HR");
    } else {
      setReviewType("TL");
    }
  };

  // Submit hierarchical review / approval (or rejection with remarks)
  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingReport) return;

    try {
      setSavingReview(true);
      if (reviewDecision === "REVISE") {
        if (!reviewFeedback || !reviewFeedback.trim()) {
          setSavingReview(false);
          return toast.error("Remarks are required when rejecting a report.");
        }
        await rejectReport(reviewingReport.id, {
          remarks: reviewFeedback.trim(),
          feedback: reviewFeedback.trim(),
        });
        toast.success("Report rejected and returned to submitter with remarks! ⚠️");
      } else {
        await approveReport(reviewingReport.id, {
          remarks: reviewFeedback.trim(),
          feedback: reviewFeedback.trim(),
        });
        toast.success(
          isSuperAdmin
            ? "Report final-approved by Super Admin (lower pending steps auto-approved)! 🛡️"
            : isHR
            ? "Report approved by HR (lower pending steps auto-approved) & forwarded to Super Admin! 🎉"
            : isDepartmentHead
            ? "Report approved by Department Head (lower pending steps auto-approved) & forwarded to HR! 🚀"
            : "Report approved & forwarded to next hierarchy level! 🚀"
        );
      }

      setReviewingReport(null);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSavingReview(false);
    }
  };

  // Helper to determine role badge and label across all 6 hierarchy levels
  const getRoleBadge = (row) => {
    const role = String(row.role_type || row.user_role || "").toUpperCase();
    const desig = String(row.designation || "").toLowerCase();
    const empType = String(row.employment_type || "").toUpperCase();

    if (
      role === "DEPARTMENT_HEAD" ||
      role === "MANAGER" ||
      desig.includes("department head") ||
      desig.includes("head of department")
    ) {
      return {
        label: "Department Head",
        icon: <ShieldCheck size={12} />,
        className: "badge-hierarchy-dept-head",
        bg: "#f3e8ff",
        color: "#6b21a8",
        border: "#e9d5ff",
      };
    }
    if (
      role === "SUB_TL" ||
      desig.includes("sub-team lead") ||
      desig.includes("sub team lead") ||
      desig.includes("sub tl")
    ) {
      return {
        label: "Sub-TL",
        icon: <UserCheck size={12} />,
        className: "badge-hierarchy-subtl",
        bg: "#e0f2fe",
        color: "#0369a1",
        border: "#bae6fd",
      };
    }
    if (
      role === "TL" ||
      desig.includes("team lead") ||
      desig.includes("team leader") ||
      desig.includes("leader")
    ) {
      return {
        label: "Team Leader",
        icon: <Crown size={12} />,
        className: "badge-hierarchy-tl",
        bg: "#fef3c7",
        color: "#b45309",
        border: "#fde68a",
      };
    }
    if (role === "INTERN" || empType === "INTERN" || desig.includes("intern")) {
      return {
        label: "Intern",
        icon: <GraduationCap size={12} />,
        className: "badge-hierarchy-intern",
        bg: "#dcfce7",
        color: "#15803d",
        border: "#bbf7d0",
      };
    }
    return {
      label: "Executive",
      icon: <Briefcase size={12} />,
      className: "badge-hierarchy-exec",
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
    };
  };

  // KPI Metrics Calculation
  const totalSubmissions = reports.length;
  const pendingTLCount = reports.filter((r) => r.status === "SUBMITTED").length;
  const pendingHRCount = reports.filter((r) => r.status === "TL_REVIEWED").length;
  const approvedCount = reports.filter(
    (r) => r.status === "HR_APPROVED" || r.status === "SUPER_ADMIN_APPROVED"
  ).length;
  const totalHoursLogged = reports.reduce(
    (sum, r) => sum + (parseFloat(r.total_hours_worked) || 0),
    0
  );

  const updateReportFilter = (updateFilter) => {
    setReportPage(1);
    updateFilter();
  };

  return (
    <div className="team-reports-page">
      {/* Header Banner */}
      <div className="team-reports-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span className="team-eyebrow">
                {isSuperAdmin ? "Super Admin Executive Control" : isHR ? "HR & Company Governance" : "Department Team Workspace"}
              </span>
              <span style={{ background: "#e0f2fe", color: "#0284c7", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px" }}>
                6-Level Hierarchy: Intern ➔ Sub-TL ➔ TL ➔ Dept Head ➔ HR ➔ Super Admin
              </span>
            </div>
            <h1 className="team-heading">
              Company Teams Daily Work & Performance Reports
            </h1>
            <p className="team-subheading">
              {isHR
                ? "Track daily work reporting across all company departments. Upper-level approvals automatically mark lower pending levels as Approved (by Higher Authority)."
                : "Track daily work reporting for your subordinates in the reporting tree. Verify or reject reports with remarks."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => updateReportFilter(() => setViewMode("TEAM"))}
              style={{
                background: viewMode === "TEAM" ? "#1e293b" : "#f1f5f9",
                color: viewMode === "TEAM" ? "#ffffff" : "#334155",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Users size={14} /> Subordinate Reports
            </button>

            <button
              onClick={() => updateReportFilter(() => setViewMode("PENDING_FOR_ME"))}
              style={{
                background: viewMode === "PENDING_FOR_ME" ? "#d97706" : "#fffbeb",
                color: viewMode === "PENDING_FOR_ME" ? "#ffffff" : "#b45309",
                border: "1px solid #fde68a",
                padding: "8px 14px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Inbox size={14} /> Pending For My Approval
            </button>

            {isSuperAdmin && viewMode === "TEAM" && (
              <button
                onClick={() => updateReportFilter(() => setVerifiedOnly((v) => !v))}
                style={{
                  background: verifiedOnly ? "#16a34a" : "#f0fdf4",
                  color: verifiedOnly ? "#ffffff" : "#15803d",
                  border: "1px solid #bbf7d0",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Show only reports verified by the chain or approved by an upper authority"
              >
                <ShieldCheck size={14} /> {verifiedOnly ? "✓ Verified Only (ON)" : "Verified Chain Filter"}
              </button>
            )}

            <button
              onClick={fetchReports}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
              }}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* ── 1. DEPARTMENT QUICK-SWITCH TABS ── */}
        <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Building2 size={15} style={{ color: "#475569" }} />
            <strong style={{ fontSize: "13px", color: "#334155" }}>
              {isHR ? "Select Department:" : "Assigned Department(s):"}
            </strong>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {/* Show "All Departments" button if HR/SuperAdmin, OR if TL manages 2+ departments */}
            {(reportScope?.unrestricted || visibleDepartments.length > 1) && (
              <button
                onClick={() => updateReportFilter(() => setSelectedDepartment("ALL"))}
                style={{
                  padding: "7px 14px",
                  borderRadius: "20px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  border: selectedDepartment === "ALL" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: selectedDepartment === "ALL" ? "#eff6ff" : "#ffffff",
                  color: selectedDepartment === "ALL" ? "#1d4ed8" : "#475569",
                  transition: "all 0.15s ease",
                }}
              >
                🏢 {isHR ? "All Departments" : `All My Departments (${visibleDepartments.length})`}
              </button>
            )}

            {visibleDepartments.map((dept) => {
              const deptId = dept.id;
              const deptName = dept.department_name;
              const isSelected =
                String(selectedDepartment) === String(deptId) ||
                selectedDepartment === deptName;

              return (
                <button
                  key={deptId}
                  onClick={() => updateReportFilter(() => setSelectedDepartment(deptId))}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "20px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: isSelected ? "#eff6ff" : "#ffffff",
                    color: isSelected ? "#1d4ed8" : "#475569",
                    transition: "all 0.15s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{deptName}</span>
                  {!isHR && visibleDepartments.length === 1 && (
                    <span
                      style={{
                        fontSize: "10px",
                        background: isSelected ? "#2563eb" : "#e2e8f0",
                        color: isSelected ? "#ffffff" : "#475569",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: "600",
                      }}
                    >
                      Assigned
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. FILTERS BAR (Hierarchy Role, User, Status, Date, Search) ── */}
        <div className="team-filters-bar" style={{ marginTop: "12px", paddingTop: "12px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "200px", flex: 1 }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Search employee name, code, designation..."
              value={searchTerm}
              onChange={(e) => updateReportFilter(() => setSearchTerm(e.target.value))}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "8px",
                border: "1.5px solid #e2e8f0",
                fontSize: "13px",
                outline: "none",
                background: "#f8fafc",
              }}
            />
          </div>

          {viewMode === "TEAM" && (
            <>
              {/* User Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={15} style={{ color: "#64748b" }} />
                <select
                  value={selectedUserId}
                  onChange={(e) => updateReportFilter(() => setSelectedUserId(e.target.value))}
                  className="filter-select"
                >
                  <option value="ALL">All Team Members</option>
                  {submitterUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hierarchy Level Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={15} style={{ color: "#64748b" }} />
                <select
                  value={selectedRoleLevel}
                  onChange={(e) => updateReportFilter(() => setSelectedRoleLevel(e.target.value))}
                  className="filter-select"
                >
                  <option value="ALL">All Hierarchy Roles</option>
                  <option value="DEPARTMENT_HEAD">🛡️ Department Heads</option>
                  <option value="TL">👑 Team Leaders (TL)</option>
                  <option value="SUB_TL">⚡ Sub-TLs</option>
                  <option value="EXECUTIVE">💼 Executives</option>
                  <option value="INTERN">🎓 Interns</option>
                </select>
              </div>

              {/* Workflow Stage Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Filter size={15} style={{ color: "#64748b" }} />
                <select
                  value={selectedStatus}
                  onChange={(e) => updateReportFilter(() => setSelectedStatus(e.target.value))}
                  className="filter-select"
                >
                  <option value="ALL">All Approval Stages</option>
                  <option value="SUBMITTED">⏳ Pending Sub-TL / TL / Dept Head ({pendingTLCount})</option>
                  <option value="TL_REVIEWED">⏳ Verified by TL/Head — Pending HR ({pendingHRCount})</option>
                  <option value="HR_APPROVED">✅ Approved (Super Admin Ready) ({approvedCount})</option>
                  <option value="SUPER_ADMIN_APPROVED">🛡️ Final Approved by Super Admin</option>
                  <option value="REVISION_REQUESTED">❌ Rejected / Revision Requested</option>
                </select>
              </div>
            </>
          )}

          {/* Date Picker */}
          <div className="filter-input-wrap">
            <Calendar size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => updateReportFilter(() => setSelectedDate(e.target.value))}
              className="filter-date-input"
            />
            {selectedDate && (
              <button
                onClick={() => updateReportFilter(() => setSelectedDate(""))}
                title="View All Dates"
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "11px",
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                ✕ All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. KPI STATS CARDS ── */}
      <div className="team-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap blue">
            <Users size={20} />
          </div>
          <div>
            <span className="stat-label">Total Submissions</span>
            <strong className="stat-number">{totalSubmissions}</strong>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div className="stat-icon-wrap amber">
            <Clock size={20} />
          </div>
          <div>
            <span className="stat-label">Pending Sub-TL / TL / Dept Head</span>
            <strong className="stat-number" style={{ color: "#d97706" }}>
              {pendingTLCount}
            </strong>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #3b82f6" }}>
          <div className="stat-icon-wrap blue">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="stat-label">Pending HR Approval</span>
            <strong className="stat-number" style={{ color: "#2563eb" }}>
              {pendingHRCount}
            </strong>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #10b981" }}>
          <div className="stat-icon-wrap green">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="stat-label">Approved & Super Admin Live</span>
            <strong className="stat-number" style={{ color: "#16a34a" }}>
              {approvedCount}
            </strong>
          </div>
        </div>
      </div>

      {/* ── 4. DEPARTMENT REPORTS TABLE & PIPELINE ── */}
      <div className="team-table-card">
        <div className="team-table-top">
          <div>
            <h3 className="team-table-title">
              {viewMode === "PENDING_FOR_ME"
                ? "Reports Awaiting My Approval (Direct & Subordinate Chain)"
                : selectedDepartment === "ALL"
                ? isHR
                  ? "All Department Submissions"
                  : "All Managed Department Submissions"
                : `${
                    departments.find(
                      (d) => String(d.id) === String(selectedDepartment)
                    )?.department_name ||
                    visibleDepartments.find(
                      (d) => String(d.id) === String(selectedDepartment)
                    )?.department_name ||
                    selectedDepartment
                  } Work Reports`}
              {selectedDate ? ` (${selectedDate})` : ""}
            </h3>
            <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              {viewMode === "PENDING_FOR_ME"
                ? "Approve or reject reports waiting in your approval chain. Approving at a higher level automatically approves any pending lower steps."
                : "Review subordinate daily logs with video proof attachments and 6-level hierarchical approval timelines."}
            </p>
          </div>
          <span className="team-count-tag">{reports.length} Records</span>
        </div>

        {loading ? (
          <div className="team-loading">Loading department reports...</div>
        ) : reports.length === 0 ? (
          <div className="team-empty">
            <AlertCircle size={36} style={{ color: "#94a3b8" }} />
            <h4>No daily work reports found</h4>
            <p>
              No submissions match the selected department, date, or role filter.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="team-reports-table">
              <thead>
                <tr>
                  <th style={{ width: "20%" }}>Employee & Role</th>
                  <th style={{ width: "14%" }}>Department</th>
                  <th style={{ width: "8%" }}>Hours</th>
                  <th style={{ width: "22%" }}>Work Summary</th>
                  <th style={{ width: "22%" }}>Approval Pipeline Tracker</th>
                  <th style={{ width: "14%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => {
                  const roleBadge = getRoleBadge(row);
                  const isOwnReport = Number(row.user_id) === Number(user?.id);
                  const isFinalApproved =
                    row.status === "SUPER_ADMIN_APPROVED" ||
                    (row.current_status === "APPROVED" &&
                      Array.isArray(row.approvals) &&
                      row.approvals.length > 0 &&
                      row.approvals.every((a) => a.status === "APPROVED"));

                  const canActOnReport =
                    !isOwnReport &&
                    !isFinalApproved &&
                    (isSuperAdmin ||
                      isHR ||
                      isDepartmentHead ||
                      isTL ||
                      isSubTL ||
                      Number(row.current_level_user_id) === Number(user?.id));

                  return (
                    <tr key={row.id}>
                      {/* Employee Info & Hierarchy Role Badge */}
                      <td>
                        <div className="member-info-cell">
                          <div className="member-avatar">
                            {row.user_avatar ? (
                              <img src={row.user_avatar} alt={row.user_name} />
                            ) : (
                              row.user_name?.slice(0, 2).toUpperCase() || "EM"
                            )}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                                {row.user_name}
                              </strong>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  background: roleBadge.bg,
                                  color: roleBadge.color,
                                  border: `1px solid ${roleBadge.border}`,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {roleBadge.icon} {roleBadge.label}
                              </span>
                              <span className="member-code">
                                {row.employee_code || `#${row.employee_id || row.user_id}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Designation */}
                      <td>
                        <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "13px" }}>
                          {row.department_name || "General"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {row.designation || row.employee_role || "Staff"}
                        </div>
                        {row.mentor_name && (
                          <div style={{ fontSize: "11px", color: "#0284c7", marginTop: "2px" }}>
                            Manager: {row.mentor_name}
                          </div>
                        )}
                      </td>

                      {/* Shift Hours */}
                      <td>
                        <span className="hours-badge" title={`${Number(row.total_hours_worked || 0).toFixed(2)} decimal hrs`}>
                          <Clock size={12} /> {formatWorkHours(row.total_hours_worked)}
                        </span>
                      </td>

                      {/* Work Tasks Summary & Video Link */}
                      <td className="summary-cell">
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#0f172a",
                            fontSize: "13px",
                            marginBottom: "2px",
                          }}
                        >
                          {row.work_title || "Daily Tasks"}
                        </div>
                        <span className="summary-text" title={row.tasks_summary}>
                          {row.tasks_summary}
                        </span>

                        {row.took_class && row.classes && row.classes.length > 0 && (
                          <div style={{ marginTop: "4px" }}>
                            <a
                              href={row.classes[0]?.video_recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="class-proof-tag"
                              style={{ textDecoration: "none" }}
                            >
                              <Video size={12} />
                              <span>{row.classes.length} Class Video Proof</span>
                            </a>
                          </div>
                        )}
                      </td>

                      {/* 6-Level Hierarchical Approval Pipeline Tracker */}
                      <td>
                        <ApprovalTimeline report={row} compact />
                      </td>

                      {/* Action Buttons based on User Role and Pipeline Stage */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            className="action-btn view-btn"
                            onClick={() => setSelectedReport(row)}
                            title="View Report Details & Full Approval Timeline"
                          >
                            <Eye size={13} /> View
                          </button>

                          {canActOnReport && (
                            <button
                              onClick={() =>
                                handleOpenReview(
                                  row,
                                  isSuperAdmin ? "SUPER_ADMIN" : isHR ? "HR" : "TL"
                                )
                              }
                              style={{
                                background: isSuperAdmin
                                  ? "#4f46e5"
                                  : isHR
                                  ? "#2563eb"
                                  : "#16a34a",
                                color: "#fff",
                                border: "none",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                fontWeight: "700",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.2)",
                              }}
                              title="Approve or Reject Report (Auto-approves any lower pending levels)"
                            >
                              <CheckCheck size={13} />{" "}
                              {isSuperAdmin
                                ? "Approve (SA)"
                                : isHR
                                ? "Approve (HR)"
                                : isDepartmentHead
                                ? "Verify (Head)"
                                : isSubTL
                                ? "Verify (Sub-TL)"
                                : "Verify (TL)"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && reportPagination.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px 16px", borderTop: "1px solid #e2e8f0" }}>
            <span style={{ color: "#64748b", fontSize: "12px" }}>
              {reportPagination.total} reports · Page {reportPagination.page} of {reportPagination.totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={reportPage <= 1}
                onClick={() => setReportPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={reportPage >= reportPagination.totalPages}
                onClick={() => setReportPage((current) => Math.min(reportPagination.totalPages, current + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. REVIEW & VERIFICATION MODAL ── */}
      {reviewingReport && (
        <div className="review-modal-overlay" onClick={() => setReviewingReport(null)}>
          <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <span className="modal-eyebrow">
                  {isSuperAdmin
                    ? "Level 6 • Super Admin Final Approval"
                    : isHR
                    ? "Level 5 • HR Compliance Approval"
                    : isDepartmentHead
                    ? "Level 4 • Department Head Verification"
                    : isSubTL
                    ? "Level 2 • Sub-TL Verification"
                    : "Level 3 • Team Leader Verification"}
                </span>
                <h3>
                  Review Report: {reviewingReport.user_name}
                </h3>
                <span className="modal-date-tag">
                  {reviewingReport.report_date} • {reviewingReport.department_name} ({getRoleBadge(reviewingReport).label})
                </span>
              </div>
              <button className="close-review-btn" onClick={() => setReviewingReport(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="review-form">
              {/* Report Summary Snippet */}
              <div className="report-snippet-box">
                <strong style={{ fontSize: "13px", color: "#0f172a" }}>Tasks Logged:</strong>
                <p style={{ margin: "4px 0 8px 0", color: "#334155", fontSize: "13px" }}>
                  {reviewingReport.tasks_summary}
                </p>

                <div style={{ marginTop: "8px" }}>
                  <ApprovalTimeline report={reviewingReport} compact />
                </div>
              </div>

              {(isDepartmentHead || isHR || isSuperAdmin) && reviewDecision === "APPROVE" && (
                <div
                  style={{
                    background: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    color: "#5b21b6",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Zap size={14} />
                  <span>
                    Skip / Auto-Approval Active: Approving at your level will automatically mark any pending lower levels as &quot;Approved (by Higher Authority)&quot;.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Review Decision</label>
                <select
                  className="form-select"
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value)}
                >
                  <option value="APPROVE">
                    ✅ Approve & Forward to Next Upper Level
                  </option>
                  <option value="REVISE">
                    ❌ Reject Report & Return to Submitter (Requires Remarks)
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Reviewer Remarks / Feedback {reviewDecision === "REVISE" ? "*" : "(Optional)"}
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required={reviewDecision === "REVISE"}
                  placeholder={
                    reviewDecision === "REVISE"
                      ? "Please specify what needs to be corrected before resubmitting..."
                      : "Optional approval remarks or feedback..."
                  }
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                />
              </div>

              <div className="review-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReviewingReport(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingReview}
                  style={{
                    background:
                      reviewDecision === "REVISE"
                        ? "#dc2626"
                        : isSuperAdmin
                        ? "#4f46e5"
                        : isHR
                        ? "#2563eb"
                        : "#16a34a",
                  }}
                >
                  {savingReview
                    ? "Saving..."
                    : reviewDecision === "REVISE"
                    ? "Reject & Send Back"
                    : "Confirm Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. DETAILS MODAL ── */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          userRole={userRole}
          onClose={() => setSelectedReport(null)}
          onReviewAsTL={(rep) => handleOpenReview(rep, "TL")}
          onReviewAsHR={(rep) => handleOpenReview(rep, "HR")}
          onReviewAsSuperAdmin={(rep) => handleOpenReview(rep, "SUPER_ADMIN")}
        />
      )}
    </div>
  );
};

export default TeamReports;
