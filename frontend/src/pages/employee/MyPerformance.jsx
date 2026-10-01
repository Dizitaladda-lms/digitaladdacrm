import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  GraduationCap,
  IndianRupee,
  Calendar,
  Layers,
  RefreshCw,
  Phone,
  Sparkles,
  Award,
  Target,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { getMyPerformance } from "../../services/employeeService";
import LeadDetailsDrawer from "../../components/common/LeadDetailsDrawer/LeadDetailsDrawer";
import WhatsAppIcon from "../../components/common/WhatsAppIcon";
import AcademicOperationsPerformance from "../../components/employee/dashboard/AcademicOperationsPerformance";
import { useAuth } from "../../context/AuthContext";
import "./MyPerformance.css";

const MyPerformance = () => {
  const { user } = useAuth();

  // If user is from Academics, Operations, IT/Dev, HR, Trainer, etc. render their dedicated scorecard
  if (user?.role && user.role !== "COUNSELLOR") {
    return <AcademicOperationsPerformance />;
  }

  return <CounsellorPerformance />;
};

const CounsellorPerformance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [perfData, setPerfData] = useState(null);

  // Drawer for inspecting lead from performance page
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await getMyPerformance();
      setPerfData(res?.data || res);
    } catch (err) {
      console.error("Error loading performance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const handleOpenLead = (lead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const summary = perfData?.summary || {};
  const weekWise = perfData?.week_wise || [];
  const recentLeads = perfData?.recent_leads || [];
  const statusBreakdown = perfData?.status_breakdown || [];
  const courseBreakdown = perfData?.course_breakdown || [];
  const employee = perfData?.employee || {};

  return (
    <div className="my-perf-container">
      {/* Header */}
      <div className="my-perf-header">
        <div>
          <h1 className="header-title">
            <TrendingUp className="header-icon" /> My Performance & Weekly Scorecard
          </h1>
          <p className="header-subtitle">
            Track your lead conversions, weekly completion rates, admissions achieved, and overall productivity in real time.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchPerformance} title="Refresh Scorecard">
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="perf-loading-state">
          <RefreshCw size={32} className="spin text-blue-600" />
          <p>Calculating your real-time performance and weekly metrics...</p>
        </div>
      ) : (
        <>
          {/* Top Counsellor Welcome Banner */}
          <div className="perf-welcome-banner">
            <div className="banner-profile">
              <div className="banner-avatar">
                {employee.full_name?.charAt(0).toUpperCase() || "C"}
              </div>
              <div>
                <h2>{employee.full_name || "Counsellor"}</h2>
                <div className="banner-meta">
                  <span className="badge-code">{employee.employee_code || "EMP"}</span>
                  <span className="badge-role">{employee.role || "COUNSELLOR"}</span>
                  <span className="badge-desig">{employee.designation || "Admissions Counsellor"}</span>
                </div>
              </div>
            </div>

            <div className="banner-conversion">
              <div className="conversion-label">
                <Target size={18} /> Overall Conversion Rate
              </div>
              <div className="conversion-number">
                {summary.conversion_rate || "0.0"}%
              </div>
              <div className="conversion-sub">
                {summary.enrolled_count || 0} Admissions from {summary.total_assigned || 0} Total Leads
              </div>
            </div>
          </div>

          {/* Interactive Core Metric Cards (4 Balanced Cards) */}
          <div className="my-perf-stats-grid">
            {/* 1. Total Leads Assigned */}
            <div
              className="perf-card blue clickable"
              onClick={() => navigate("/employee/leads")}
              role="button"
              tabIndex={0}
              title="Click to view all your assigned leads"
            >
              <div className="card-top">
                <span>Total Leads Assigned</span>
                <div className="icon-wrap blue"><Users size={20} /></div>
              </div>
              <div className="card-value">{Number(summary.total_assigned || 0).toLocaleString("en-IN")}</div>
              <div className="card-sub-link">
                <span>View Leads</span>
                <ArrowRight size={13} />
              </div>
            </div>

            {/* 2. Pending Follow-ups */}
            <div
              className="perf-card amber clickable"
              onClick={() => navigate("/employee/followups")}
              role="button"
              tabIndex={0}
              title="Click to open your follow-up planner"
            >
              <div className="card-top">
                <span>Pending Follow-ups</span>
                <div className="icon-wrap amber"><Clock size={20} /></div>
              </div>
              <div className="card-value">{Number(summary.pending_leads || 0).toLocaleString("en-IN")}</div>
              <div className="card-sub-link">
                <span>Open Follow-ups</span>
                <ArrowRight size={13} />
              </div>
            </div>

            {/* 3. Admissions Enrolled */}
            <div
              className="perf-card purple clickable"
              onClick={() => navigate("/employee/admissions")}
              role="button"
              tabIndex={0}
              title="Click to open your student admissions & fee ledger"
            >
              <div className="card-top">
                <span>Admissions Enrolled</span>
                <div className="icon-wrap purple"><GraduationCap size={20} /></div>
              </div>
              <div className="card-value">{Number(summary.enrolled_count || 0).toLocaleString("en-IN")}</div>
              <div className="card-sub-link">
                <span>View Admissions</span>
                <ArrowRight size={13} />
              </div>
            </div>

            {/* 4. Fee Revenue Collected */}
            <div
              className="perf-card green clickable"
              onClick={() => navigate("/employee/admissions")}
              role="button"
              tabIndex={0}
              title="Click to view fee collection ledger"
            >
              <div className="card-top">
                <span>Fee Revenue Collected</span>
                <div className="icon-wrap green"><IndianRupee size={20} /></div>
              </div>
              <div className="card-value" style={{ color: "#16A34A" }}>
                ₹{Number(summary.total_fees_collected || 0).toLocaleString("en-IN")}
              </div>
              <div className="card-sub-link" style={{ color: "#16A34A" }}>
                <span>Fee Collection</span>
                <ArrowRight size={13} />
              </div>
            </div>
          </div>

          {/* Pipeline Stage Breakdown & Top Courses (More Performance Details) */}
          <div className="perf-insights-grid">
            {/* Lead Pipeline Stages */}
            <div className="perf-insight-card">
              <div className="section-header-box" style={{ marginBottom: "14px" }}>
                <Target size={18} className="text-blue-600" />
                <div>
                  <h3 style={{ fontSize: "14.5px" }}>Lead Pipeline & Stages</h3>
                  <p style={{ fontSize: "12px" }}>Distribution across counselling stages</p>
                </div>
              </div>
              {statusBreakdown.length === 0 ? (
                <p className="no-data">No lead stages recorded yet.</p>
              ) : (
                <div className="stage-chips-grid">
                  {statusBreakdown.map((sb, idx) => {
                    const st = String(sb.status || "").toUpperCase();
                    let colorClass = "blue";
                    if (st.includes("ENROLL") || st.includes("ADMISSION")) colorClass = "purple";
                    else if (st.includes("FOLLOW")) colorClass = "amber";
                    else if (st.includes("WALK")) colorClass = "green";
                    else if (st.includes("NOT") || st.includes("REJECT") || st.includes("LOST")) colorClass = "rose";

                    return (
                      <div key={idx} className={`stage-chip-box ${colorClass}`}>
                        <div className="stage-chip-top">
                          <span className="stage-name">{sb.status}</span>
                          <span className="stage-count">{sb.count}</span>
                        </div>
                        <div className="stage-bar-track">
                          <div
                            className="stage-bar-fill"
                            style={{
                              width: `${summary.total_leads > 0 ? Math.min(100, Math.round((Number(sb.count) / summary.total_leads) * 100)) : 0}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Converting Courses */}
            <div className="perf-insight-card">
              <div className="section-header-box" style={{ marginBottom: "14px" }}>
                <GraduationCap size={18} className="text-purple-600" />
                <div>
                  <h3 style={{ fontSize: "14.5px" }}>Top Converting Courses</h3>
                  <p style={{ fontSize: "12px" }}>Courses with highest student enrollments</p>
                </div>
              </div>
              {courseBreakdown.length === 0 ? (
                <p className="no-data">No course conversion records yet.</p>
              ) : (
                <div className="courses-perf-list">
                  {courseBreakdown.map((cb, idx) => {
                    const convRate = Number(cb.total_leads) > 0 ? Math.round((Number(cb.enrolled) / Number(cb.total_leads)) * 100) : 0;
                    return (
                      <div key={idx} className="course-perf-item">
                        <div className="course-perf-info">
                          <strong className="course-name">{cb.course}</strong>
                          <span className="course-meta">{cb.total_leads} leads handled</span>
                        </div>
                        <div className="course-perf-stats">
                          <span className="badge-enrolled">🎓 {cb.enrolled} Enrolled</span>
                          <span className="badge-rate">{convRate}% conv.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Week-Wise Performance Table */}
          <div className="my-perf-section">
            <div className="section-header-box">
              <Calendar size={20} className="text-blue-600" />
              <div>
                <h3>Week-Wise Performance Breakdown</h3>
                <p>Track your weekly productivity, completed follow-ups, and student enrollments</p>
              </div>
            </div>

            {weekWise.length === 0 ? (
              <p className="no-data">No weekly records available yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="perf-table">
                  <thead>
                    <tr>
                      <th>Week / Duration</th>
                      <th>Assigned</th>
                      <th>Completed</th>
                      <th>Pending</th>
                      <th>Admissions Done</th>
                      <th>Fees Collected (₹)</th>
                      <th>Weekly Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekWise.map((w, idx) => {
                      const assigned = Number(w.assigned_count || 0);
                      const completed = Number(w.completed_count || 0);
                      const pending = Number(w.pending_count || 0);
                      const enrolled = Number(w.enrolled_count || 0);
                      const fees = Number(w.fees_collected || 0);
                      const rate = assigned > 0 ? Math.min(100, Math.round((completed / assigned) * 100)) : 0;

                      return (
                        <tr key={idx}>
                          <td>
                            <div className="week-title">{w.week_name}</div>
                            <div className="week-dates">{w.week_label}</div>
                          </td>
                          <td><span className="pill blue">{assigned}</span></td>
                          <td><span className="pill green">{completed}</span></td>
                          <td><span className="pill amber">{pending}</span></td>
                          <td><span className="pill purple">🎓 {enrolled}</span></td>
                          <td>
                            <strong className="text-green-700">
                              ₹{fees.toLocaleString("en-IN")}
                            </strong>
                          </td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-track">
                                <div
                                  className={`progress-fill ${rate >= 70 ? "fill-green" : rate >= 40 ? "fill-blue" : "fill-amber"}`}
                                  style={{ width: `${rate}%` }}
                                ></div>
                              </div>
                              <span className="progress-text">{rate}%</span>
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

          {/* Active Assigned Leads */}
          <div className="my-perf-section">
            <div className="section-header-box">
              <Layers size={20} className="text-purple-600" />
              <div>
                <h3>Recent Assigned Leads Pipeline</h3>
                <p>Click any lead card to open the guided 4-step counselling drawer</p>
              </div>
            </div>

            {recentLeads.length === 0 ? (
              <p className="no-data">No active leads assigned yet.</p>
            ) : (
              <div className="leads-mini-grid">
                {recentLeads.map((l) => (
                  <div
                    key={l.id}
                    className="lead-mini-card"
                  >
                    <div
                      className="lead-mini-main clickable"
                      onClick={() => handleOpenLead(l)}
                      title="Click to open lead profile & counselling drawer"
                    >
                      <div className="lead-mini-top">
                        <div className="l-name">{l.full_name}</div>
                        <span className={`l-status ${l.status?.toLowerCase()}`}>
                          {l.status}
                        </span>
                      </div>
                      <div className="l-course">{l.interested_course || "Program Inquiry"}</div>
                      <div className="l-phone">
                        <Phone size={12} /> {l.mobile}
                      </div>
                    </div>
                    {l.mobile && (
                      <div className="lead-mini-actions">
                        <a
                          href={`https://wa.me/91${String(l.mobile).replace(/\D/g, "").slice(-10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mini-wa-btn"
                          title={`WhatsApp ${l.full_name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <WhatsAppIcon size={14} />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Guided 4-Step Counselling Drawer */}
      <LeadDetailsDrawer
        open={isDrawerOpen}
        lead={selectedLead}
        leadId={selectedLead?.id}
        mode="edit"
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLead(null);
        }}
        onUpdated={fetchPerformance}
        onStatusUpdated={fetchPerformance}
      />
    </div>
  );
};

export default MyPerformance;
