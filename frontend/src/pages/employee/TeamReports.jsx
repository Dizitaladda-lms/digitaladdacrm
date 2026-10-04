import React, { useState, useEffect } from "react";
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
  TrendingUp,
  ShieldCheck,
  Crown,
  Briefcase,
  GraduationCap,
  Building2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  Lock,
  Layers,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getTeamReports,
  reviewReportAsTL,
  reviewReportAsHR,
  reviewReportAsSuperAdmin,
} from "../../services/reportService";
import { getDepartments } from "../../services/departmentService";
import ReportDetailsModal from "../../components/reports/ReportDetailsModal";
import { useAuth } from "../../context/AuthContext";
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
  const isTL =
    userRole === "TL" ||
    userRole === "MANAGER" ||
    (user?.designation && /team lead|leader|head|manager/i.test(user.designation));

  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("ALL"); // "ALL" or department ID / name
  const [selectedRoleLevel, setSelectedRoleLevel] = useState("ALL"); // "ALL" | "TL" | "EXECUTIVE" | "INTERN"
  const [selectedStatus, setSelectedStatus] = useState("ALL"); // "ALL" | "SUBMITTED" | "TL_REVIEWED" | "HR_APPROVED" | "REVISION_REQUESTED"
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState([]);
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

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await getTeamReports({
        departmentId: selectedDepartment !== "ALL" ? selectedDepartment : undefined,
        roleType: selectedRoleLevel !== "ALL" ? selectedRoleLevel : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        date: selectedDate || undefined,
        search: searchTerm || undefined,
      });
      if (res?.data?.reports) {
        setReports(res.data.reports);
      } else {
        setReports([]);
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
  }, [selectedDepartment, selectedRoleLevel, selectedStatus, selectedDate, searchTerm]);

  // Open review modal with appropriate role target
  const handleOpenReview = (report, targetRole = null) => {
    setReviewingReport(report);
    setReviewFeedback(
      targetRole === "HR" ? report.hr_feedback || "" : report.tl_feedback || ""
    );
    setReviewDecision("APPROVE");

    if (targetRole) {
      setReviewType(targetRole);
    } else if (report.status === "SUBMITTED" && (isTL || isSuperAdmin || isHR)) {
      setReviewType("TL");
    } else if (report.status === "TL_REVIEWED" && (isHR || isSuperAdmin)) {
      setReviewType("HR");
    } else if (isSuperAdmin) {
      setReviewType("SUPER_ADMIN");
    } else {
      setReviewType("TL");
    }
  };

  // Submit review / approval
  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewingReport) return;

    try {
      setSavingReview(true);
      if (reviewType === "TL") {
        const nextStatus =
          reviewDecision === "REVISE" ? "REVISION_REQUESTED" : "TL_REVIEWED";
        await reviewReportAsTL(reviewingReport.id, {
          feedback: reviewFeedback,
          status: nextStatus,
        });
        toast.success(
          reviewDecision === "REVISE"
            ? "Revision requested from employee! ⚠️"
            : "Report verified by Team Leader! Automatically forwarded to HR. 🚀"
        );
      } else if (reviewType === "HR") {
        const nextStatus =
          reviewDecision === "REVISE" ? "REVISION_REQUESTED" : "HR_APPROVED";
        await reviewReportAsHR(reviewingReport.id, {
          feedback: reviewFeedback,
          status: nextStatus,
        });
        toast.success(
          reviewDecision === "REVISE"
            ? "Revision requested from employee! ⚠️"
            : "Report verified & approved by HR! Now visible to Super Admin. 🎉"
        );
      } else if (reviewType === "SUPER_ADMIN") {
        const nextStatus =
          reviewDecision === "REVISE" ? "REVISION_REQUESTED" : "SUPER_ADMIN_APPROVED";
        await reviewReportAsSuperAdmin(reviewingReport.id, {
          feedback: reviewFeedback,
          status: nextStatus,
        });
        toast.success("Report confirmed by Super Admin! 🛡️");
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

  // Helper to determine role badge and label
  const getRoleBadge = (row) => {
    const role = String(row.role_type || "").toUpperCase();
    const desig = String(row.designation || "").toLowerCase();
    const empType = String(row.employment_type || "").toUpperCase();

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

  return (
    <div className="team-reports-page">
      {/* Header Banner */}
      <div className="team-reports-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span className="team-eyebrow">
                {isSuperAdmin ? "Super Admin Executive Control" : isHR ? "HR & Company Governance" : "Department Team Workspace"}
              </span>
              <span style={{ background: "#e0f2fe", color: "#0284c7", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px" }}>
                3-Tier Hierarchy: Team Leader ➔ HR ➔ Super Admin
              </span>
            </div>
            <h1 className="team-heading">
              Company Teams Daily Work & Performance Reports
            </h1>
            <p className="team-subheading">
              Track daily work reporting across all 6 departments. Interns & Executives submit to Team Leaders, TLs verify to HR, and HR approvals unlock live Super Admin visibility.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
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
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Reports
            </button>
          </div>
        </div>

        {/* ── 1. DEPARTMENT QUICK-SWITCH TABS ── */}
        <div style={{ marginTop: "14px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Building2 size={15} style={{ color: "#475569" }} />
            <strong style={{ fontSize: "13px", color: "#334155" }}>Select Department:</strong>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedDepartment("ALL")}
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
              🏢 All Departments
            </button>

            {SIX_OFFICIAL_DEPARTMENTS.map((deptName) => {
              const deptObj = departments.find(
                (d) => d.department_name?.toLowerCase() === deptName.toLowerCase()
              );
              const deptId = deptObj?.id || deptName;
              const isSelected =
                String(selectedDepartment) === String(deptId) ||
                selectedDepartment === deptName;

              return (
                <button
                  key={deptName}
                  onClick={() => setSelectedDepartment(deptId)}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. FILTERS BAR (Hierarchy Role, Status, Date, Search) ── */}
        <div className="team-filters-bar" style={{ marginTop: "12px", paddingTop: "12px" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "220px", flex: 1 }}>
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
              onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Hierarchy Level Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Layers size={15} style={{ color: "#64748b" }} />
            <select
              value={selectedRoleLevel}
              onChange={(e) => setSelectedRoleLevel(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Roles (TL, Exec & Interns)</option>
              <option value="TL">👑 Team Leader Only</option>
              <option value="EXECUTIVE">💼 Executives Only</option>
              <option value="INTERN">🎓 Interns Only</option>
            </select>
          </div>

          {/* Workflow Stage Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={15} style={{ color: "#64748b" }} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Approval Stages</option>
              <option value="SUBMITTED">⏳ 1. Pending TL Verification ({pendingTLCount})</option>
              <option value="TL_REVIEWED">⏳ 2. Pending HR Approval ({pendingHRCount})</option>
              <option value="HR_APPROVED">✅ 3. Approved (Super Admin Ready) ({approvedCount})</option>
              <option value="REVISION_REQUESTED">🔄 Revision Requested</option>
            </select>
          </div>

          {/* Date Picker */}
          <div className="filter-input-wrap">
            <Calendar size={15} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-date-input"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
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
            <span className="stat-label">Pending TL Verification</span>
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
              {selectedDepartment === "ALL"
                ? "All Department Submissions"
                : `${
                    departments.find(
                      (d) => String(d.id) === String(selectedDepartment)
                    )?.department_name || selectedDepartment
                  } Work Reports`}
              {selectedDate ? ` (${selectedDate})` : ""}
            </h3>
            <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "13px" }}>
              Review Team Leader, Executive, and Intern daily logs with video proof attachments and multi-tier approval sign-offs.
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
                  <th style={{ width: "22%" }}>Employee & Role</th>
                  <th style={{ width: "16%" }}>Department</th>
                  <th style={{ width: "8%" }}>Hours</th>
                  <th style={{ width: "22%" }}>Work Summary</th>
                  <th style={{ width: "18%" }}>Approval Pipeline Tracker</th>
                  <th style={{ width: "14%", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => {
                  const roleBadge = getRoleBadge(row);

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
                            TL: {row.mentor_name}
                          </div>
                        )}
                      </td>

                      {/* Shift Hours */}
                      <td>
                        <span className="hours-badge">
                          <Clock size={12} /> {row.total_hours_worked || 8}h
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

                      {/* 3-Tier Approval Pipeline Tracker */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {row.status === "SUBMITTED" ? (
                            <span
                              style={{
                                fontSize: "11.5px",
                                fontWeight: "700",
                                color: "#b45309",
                                background: "#fef3c7",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #fde68a",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                width: "fit-content",
                              }}
                            >
                              ⏳ 1. Pending TL Verification
                            </span>
                          ) : row.status === "TL_REVIEWED" ? (
                            <>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  color: "#15803d",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                ✓ TL Verified ({row.tl_name || "Team Lead"})
                              </span>
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: "700",
                                  color: "#1d4ed8",
                                  background: "#eff6ff",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #bfdbfe",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  width: "fit-content",
                                }}
                              >
                                ⏳ 2. Pending HR Approval
                              </span>
                            </>
                          ) : row.status === "HR_APPROVED" || row.status === "SUPER_ADMIN_APPROVED" ? (
                            <>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  color: "#15803d",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                ✓ HR Approved ({row.hr_name || "HR"})
                              </span>
                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: "700",
                                  color: "#15803d",
                                  background: "#dcfce7",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #bbf7d0",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  width: "fit-content",
                                }}
                              >
                                👁️ Super Admin Live
                              </span>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: "11.5px",
                                fontWeight: "700",
                                color: "#b91c1c",
                                background: "#fee2e2",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                border: "1px solid #fecaca",
                                width: "fit-content",
                              }}
                            >
                              ⚠️ Revision Requested
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons based on User Role and Pipeline Stage */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            className="action-btn view-btn"
                            onClick={() => setSelectedReport(row)}
                            title="View Report Details"
                          >
                            <Eye size={13} /> View
                          </button>

                          {/* Action 1: If report is SUBMITTED, TL or HR/Admin can verify */}
                          {row.status === "SUBMITTED" && (isTL || isHR || isSuperAdmin) && (
                            <button
                              onClick={() => handleOpenReview(row, "TL")}
                              style={{
                                background: "#16a34a",
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
                                boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
                              }}
                              title="Verify as Team Leader & forward to HR"
                            >
                              <CheckCheck size={13} /> Verify TL
                            </button>
                          )}

                          {/* Action 2: If report is TL_REVIEWED, HR or Super Admin can approve */}
                          {row.status === "TL_REVIEWED" && (isHR || isSuperAdmin) && (
                            <button
                              onClick={() => handleOpenReview(row, "HR")}
                              style={{
                                background: "#2563eb",
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
                                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
                              }}
                              title="Approve as HR & unlock for Super Admin"
                            >
                              <ShieldCheck size={13} /> Approve HR
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
      </div>

      {/* ── 5. REVIEW & VERIFICATION MODAL ── */}
      {reviewingReport && (
        <div className="review-modal-overlay" onClick={() => setReviewingReport(null)}>
          <div className="review-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div>
                <span className="modal-eyebrow">
                  {reviewType === "HR"
                    ? "Tier-2 HR Compliance Review"
                    : reviewType === "SUPER_ADMIN"
                    ? "Tier-3 Super Admin Final Audit"
                    : "Tier-1 Team Leader Verification"}
                </span>
                <h3>
                  {reviewType === "HR" ? "HR Approval" : "TL Verification"}: {reviewingReport.user_name}
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

                {reviewingReport.tl_feedback && (
                  <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", marginTop: "6px", fontSize: "12px" }}>
                    <strong>TL Note ({reviewingReport.tl_name}):</strong> {reviewingReport.tl_feedback}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Review Decision</label>
                <select
                  className="form-select"
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value)}
                >
                  <option value="APPROVE">
                    {reviewType === "HR"
                      ? "✅ Approve & Send to Super Admin (HR Approved)"
                      : "✅ Verify & Forward to HR (TL Verified)"}
                  </option>
                  <option value="REVISE">
                    ⚠️ Request Changes / Needs Revision
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {reviewType === "HR" ? "HR Comments & Notes" : "Team Leader Feedback"}
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder={
                    reviewType === "HR"
                      ? "Approved for payroll and compliance / Verified by HR team."
                      : "Great progress on campaign metrics / Please attach the recorded call recording."
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
                        : reviewType === "HR"
                        ? "#2563eb"
                        : "#16a34a",
                  }}
                >
                  {savingReview
                    ? "Saving..."
                    : reviewDecision === "REVISE"
                    ? "Request Revision"
                    : reviewType === "HR"
                    ? "Confirm HR Approval"
                    : "Confirm TL Verification"}
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
