import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  Clock,
  Clock3,
  PhoneCall,
  TimerReset,
  Phone,
  MessageCircle,
  Eye,
  ArrowRight,
  Filter,
  CheckCircle2,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import LeadDetailsDrawer from "../../components/common/LeadDetailsDrawer/LeadDetailsDrawer";
import UpdateFollowupModal from "../../components/employee/followups/UpdateFollowupModal";
import { getFollowups } from "../../services/followupService";
import { exportToCsv } from "../../utils/exportCsv";
import { useAuth } from "../../context/AuthContext";

const MyFollowups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const leadsPath = isAdmin ? "/leads" : "/employee/leads";
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  // Drawer state
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Update Callback Modal state
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const loadFollowups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getFollowups({ limit: 100 });
      const list = response?.data?.data || response?.data || response || [];
      setFollowups(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error loading follow-ups:", error);
      toast.error(error?.response?.data?.message || "Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

  // Statistics calculation
  const stats = useMemo(() => {
    const now = new Date();
    const pending = followups.filter(
      (item) => (item.status || "").toUpperCase() === "PENDING"
    );
    const dueToday = pending.filter(
      (item) =>
        item.next_followup_at &&
        new Date(item.next_followup_at).toDateString() === now.toDateString()
    ).length;
    const overdue = pending.filter(
      (item) => item.next_followup_at && new Date(item.next_followup_at) < now
    ).length;
    const completed = followups.filter(
      (item) => (item.status || "").toUpperCase() === "COMPLETED"
    ).length;

    return {
      dueToday,
      overdue,
      completed,
      upcoming: pending.length,
    };
  }, [followups]);

  // Filtered and Prioritized Followups List (Active/Pending on TOP, Completed at BOTTOM)
  const filteredFollowups = useMemo(() => {
    const now = new Date();
    let list = [...followups];

    if (activeFilter === "Due Today") {
      list = list.filter(
        (item) =>
          (item.status || "").toUpperCase() === "PENDING" &&
          item.next_followup_at &&
          new Date(item.next_followup_at).toDateString() === now.toDateString()
      );
    } else if (activeFilter === "Overdue") {
      list = list.filter(
        (item) =>
          (item.status || "").toUpperCase() === "PENDING" &&
          item.next_followup_at &&
          new Date(item.next_followup_at) < now
      );
    } else if (activeFilter === "Upcoming") {
      list = list.filter(
        (item) =>
          (item.status || "").toUpperCase() === "PENDING" &&
          item.next_followup_at &&
          new Date(item.next_followup_at) > now
      );
    } else if (activeFilter === "Completed / Closed") {
      list = list.filter(
        (item) => (item.status || "").toUpperCase() === "COMPLETED"
      );
    }

    // Sort order: PENDING always on top, COMPLETED at bottom
    // Within PENDING: Overdue and Due Today first, then ascending by next_followup_at
    list.sort((a, b) => {
      const aIsPending = (a.status || "").toUpperCase() === "PENDING";
      const bIsPending = (b.status || "").toUpperCase() === "PENDING";

      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;

      if (aIsPending && bIsPending) {
        const aTime = a.next_followup_at ? new Date(a.next_followup_at).getTime() : Infinity;
        const bTime = b.next_followup_at ? new Date(b.next_followup_at).getTime() : Infinity;
        return aTime - bTime;
      }

      // Both completed: most recent first
      const aUpd = new Date(a.updated_at || a.created_at || 0).getTime();
      const bUpd = new Date(b.updated_at || b.created_at || 0).getTime();
      return bUpd - aUpd;
    });

    return list;
  }, [followups, activeFilter]);

  const handleOpenLeadDrawer = (item) => {
    const leadObj = {
      id: item.lead_id || item.id,
      lead_code: item.lead_code || `LEAD${String(item.lead_id || item.id).padStart(6, "0")}`,
      full_name: item.lead_name || item.full_name || "Student Lead",
      mobile: item.mobile || item.lead_mobile || "",
      email: item.email || "",
      status: item.lead_status || item.status || "FOLLOW_UP",
      priority: item.priority || "MEDIUM",
      interested_course: item.interested_course || "",
    };
    setSelectedLead(leadObj);
    setIsDrawerOpen(true);
  };

  const handleOpenUpdateModal = (item) => {
    setSelectedFollowup(item);
    setIsUpdateModalOpen(true);
  };

  const handleExportFollowupsCsv = () => {
    exportToCsv(
      `Dizital_Adda_Followups_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: "Lead Code", key: "lead_code" },
        { header: "Student Name", key: "lead_name" },
        { header: "Mobile", key: "mobile" },
        { header: "Interested Course", key: "interested_course" },
        { header: "Channel", key: "followup_type" },
        { header: "Scheduled Time", key: "next_followup_at" },
        { header: "Status", key: "status" },
        { header: "Remarks", key: "remarks" },
      ],
      filteredFollowups
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          backgroundColor: "#FFFFFF",
          padding: "20px 24px",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "#0F172A",
              margin: 0,
            }}
          >
            Follow-up Planner & Calls
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "#64748B",
              margin: "4px 0 0 0",
              fontWeight: 500,
            }}
          >
            Plan student conversations, complete callbacks, and track leads directly from your pipeline
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleExportFollowupsCsv}
            className="crm-btn-secondary"
            style={{ height: "42px", backgroundColor: "#F1F5F9" }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(leadsPath)}
            className="crm-btn-primary"
            style={{ height: "42px", padding: "0 18px", fontSize: "13px" }}
          >
            <span>{isAdmin ? "Go to All Leads Pipeline" : "Go to My Leads Pipeline"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="crm-card" style={{ marginBottom: 0, padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#FEF3C7",
                color: "#D97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock3 size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Due Today
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {loading ? "—" : stats.dueToday}
              </h3>
            </div>
          </div>
        </div>

        <div className="crm-card" style={{ marginBottom: 0, padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#FEF2F2",
                color: "#DC2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TimerReset size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Overdue Callbacks
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#DC2626", margin: 0 }}>
                {loading ? "—" : stats.overdue}
              </h3>
            </div>
          </div>
        </div>

        <div className="crm-card" style={{ marginBottom: 0, padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#DCFCE7",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Completed Calls
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#16A34A", margin: 0 }}>
                {loading ? "—" : stats.completed}
              </h3>
            </div>
          </div>
        </div>

        <div className="crm-card" style={{ marginBottom: 0, padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#F3E8FF",
                color: "#9333EA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhoneCall size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Total Pending
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {loading ? "—" : stats.upcoming}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <Filter size={16} style={{ color: "#64748B", marginRight: "4px" }} />
        {["All", "Due Today", "Overdue", "Upcoming", "Completed / Closed"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveFilter(tab)}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border: "1px solid #E2E8F0",
              cursor: "pointer",
              backgroundColor: activeFilter === tab ? "#2563EB" : "#FFFFFF",
              color: activeFilter === tab ? "#FFFFFF" : "#64748B",
              transition: "all 0.2s ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Followups Data Table */}
      <div className="crm-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "14px", color: "#64748B" }}>
            Loading follow-up tasks...
          </div>
        ) : filteredFollowups.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              backgroundColor: "#F8FAFC",
              borderRadius: "12px",
              border: "1px dashed #CBD5E1",
              fontSize: "14px",
              color: "#64748B",
            }}
          >
            No follow-ups match the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0", fontSize: "12px", color: "#64748B", textTransform: "uppercase" }}>
                  <th style={{ padding: "14px 16px" }}>Student Lead</th>
                  <th style={{ padding: "14px 16px" }}>Interested Course</th>
                  <th style={{ padding: "14px 16px" }}>Channel</th>
                  <th style={{ padding: "14px 16px" }}>Next Follow-up Schedule</th>
                  <th style={{ padding: "14px 16px" }}>Status / Outcome</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map((item) => {
                  const leadName = item.lead_name || item.full_name || "Student Lead";
                  const mobile = item.mobile || item.lead_mobile || "";
                  const cleanMobile = mobile.replace(/\D/g, "");
                  const isPending = (item.status || "").toUpperCase() === "PENDING";
                  const isCompleted = (item.status || "").toUpperCase() === "COMPLETED";

                  const now = new Date();
                  const targetDate = item.next_followup_at ? new Date(item.next_followup_at) : null;
                  const isItemOverdue = isPending && targetDate && targetDate < now;
                  const isDueToday = isPending && targetDate && targetDate.toDateString() === now.toDateString();

                  // Relative display string for Next Follow-up column
                  let scheduleBadge = "No Date Set";
                  if (targetDate) {
                    const timeStr = targetDate.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                    const dateStr = targetDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    });

                    if (isDueToday) {
                      scheduleBadge = `Today at ${timeStr}`;
                    } else if (isItemOverdue) {
                      scheduleBadge = `Overdue (${dateStr} ${timeStr})`;
                    } else {
                      scheduleBadge = `${dateStr} at ${timeStr}`;
                    }
                  }

                  const outcome = (item.outcome || item.lead_status || "").toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        backgroundColor: isCompleted ? "#FAF5FF" : isItemOverdue ? "#FFFDFD" : "#FFFFFF",
                        transition: "background-color 0.2s ease",
                        opacity: isCompleted && outcome === "NOT_INTERESTED" ? 0.75 : 1,
                      }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div>
                          <strong style={{ fontSize: "14px", color: "#0F172A", display: "block" }}>
                            {leadName}
                          </strong>
                          <span style={{ fontSize: "12px", color: "#64748B" }}>
                            {mobile || "No Mobile"}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                        {item.interested_course || "Digital Marketing"}
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "13px", color: "#64748B" }}>
                        <span className="crm-badge crm-badge-status" style={{ fontSize: "11px" }}>
                          {item.followup_type || "CALL"}
                        </span>
                      </td>

                      {/* Next Follow-up Schedule Column */}
                      <td style={{ padding: "14px 16px" }}>
                        {isPending ? (
                          <div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                backgroundColor: isItemOverdue ? "#FEF2F2" : isDueToday ? "#FFFBEB" : "#EFF6FF",
                                color: isItemOverdue ? "#DC2626" : isDueToday ? "#D97706" : "#2563EB",
                                border: `1px solid ${isItemOverdue ? "#FECACA" : isDueToday ? "#FDE68A" : "#BFDBFE"}`,
                              }}
                            >
                              <Clock size={13} />
                              <span>{scheduleBadge}</span>
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#64748B" }}>
                            Completed on {new Date(item.updated_at || item.created_at).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Status / Outcome Column */}
                      <td style={{ padding: "14px 16px" }}>
                        {isPending ? (
                          <span
                            className={`crm-badge ${isItemOverdue ? "crm-badge-high" : isDueToday ? "crm-badge-medium" : "crm-badge-low"}`}
                            style={{ fontSize: "11px" }}
                          >
                            {isItemOverdue ? "OVERDUE" : isDueToday ? "DUE TODAY" : "UPCOMING"}
                          </span>
                        ) : outcome === "ENROLLED" ? (
                          <span
                            className="crm-badge"
                            style={{
                              backgroundColor: "#F5F3FF",
                              color: "#7C3AED",
                              border: "1px solid #DDD6FE",
                              fontWeight: 700,
                              fontSize: "11px",
                            }}
                          >
                            ENROLLED
                          </span>
                        ) : outcome === "NOT_INTERESTED" ? (
                          <span
                            className="crm-badge"
                            style={{
                              backgroundColor: "#FEF2F2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                              fontSize: "11px",
                            }}
                          >
                            NOT INTERESTED
                          </span>
                        ) : outcome === "WALK_IN" ? (
                          <span
                            className="crm-badge"
                            style={{
                              backgroundColor: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                              fontSize: "11px",
                            }}
                          >
                            WALKIN
                          </span>
                        ) : (
                          <span className="crm-badge crm-badge-low" style={{ fontSize: "11px" }}>
                            COMPLETED
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          {cleanMobile && (
                            <>
                              <a
                                href={`tel:${cleanMobile}`}
                                title={`Call ${leadName}`}
                                style={{
                                  padding: "7px",
                                  borderRadius: "8px",
                                  backgroundColor: "#DCFCE7",
                                  color: "#16A34A",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Phone size={14} />
                              </a>

                              <a
                                href={`https://wa.me/91${cleanMobile}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`WhatsApp ${leadName}`}
                                style={{
                                  padding: "7px",
                                  borderRadius: "8px",
                                  backgroundColor: "#E0E7FF",
                                  color: "#4338CA",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <MessageCircle size={14} />
                              </a>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenUpdateModal(item)}
                            title="Update Callback / Status"
                            className="crm-btn-primary"
                            style={{ height: "32px", padding: "0 10px", fontSize: "11px", backgroundColor: "#2563EB" }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Update Callback</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLeadDrawer(item)}
                            title="View Lead Details"
                            className="crm-btn-secondary"
                            style={{ height: "32px", padding: "0 8px" }}
                          >
                            <Eye size={14} />
                          </button>
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

      {/* Direct Follow-up Callback Action Modal */}
      <UpdateFollowupModal
        followup={selectedFollowup}
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onSuccess={loadFollowups}
      />

      {/* Shared Lead Details Drawer */}
      <LeadDetailsDrawer
        open={isDrawerOpen}
        lead={selectedLead}
        onClose={() => setIsDrawerOpen(false)}
        onStatusUpdated={loadFollowups}
        role="counsellor"
      />
    </div>
  );
};

export default MyFollowups;
