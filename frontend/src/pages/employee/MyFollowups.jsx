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
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import LeadDetailsDrawer from "../../components/common/LeadDetailsDrawer/LeadDetailsDrawer";
import UpdateFollowupModal from "../../components/employee/followups/UpdateFollowupModal";
import { getFollowups } from "../../services/followupService";
import { exportToCsv } from "../../utils/exportCsv";
import { useAuth } from "../../context/AuthContext";

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

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

  const [searchTerm, setSearchTerm] = useState("");

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

  // Filtered and Prioritized Followups List
  const filteredFollowups = useMemo(() => {
    const now = new Date();
    let list = [...followups];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((item) => {
        const name = (item.lead_name || item.full_name || "").toLowerCase();
        const mobile = (item.mobile || item.lead_mobile || "").toLowerCase();
        const course = (item.interested_course || "").toLowerCase();
        const remarks = (item.remarks || "").toLowerCase();
        return (
          name.includes(term) ||
          mobile.includes(term) ||
          course.includes(term) ||
          remarks.includes(term)
        );
      });
    }

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
    list.sort((a, b) => {
      const aIsPending = (a.status || "").toUpperCase() === "PENDING";
      const bIsPending = (b.status || "").toUpperCase() === "PENDING";

      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;

      if (aIsPending && bIsPending) {
        const aTime = a.next_followup_at
          ? new Date(a.next_followup_at).getTime()
          : Infinity;
        const bTime = b.next_followup_at
          ? new Date(b.next_followup_at).getTime()
          : Infinity;
        return aTime - bTime;
      }

      const aUpd = new Date(a.updated_at || a.created_at || 0).getTime();
      const bUpd = new Date(b.updated_at || b.created_at || 0).getTime();
      return bUpd - aUpd;
    });

    return list;
  }, [followups, activeFilter, searchTerm]);

  const handleOpenLeadDrawer = (item) => {
    const leadObj = {
      id: item.lead_id || item.id,
      lead_code:
        item.lead_code ||
        `LEAD${String(item.lead_id || item.id).padStart(6, "0")}`,
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
    <div
      style={{
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          borderRadius: "14px",
          padding: "24px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  background: "rgba(37, 99, 235, 0.2)",
                  color: "#93c5fd",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(147, 197, 253, 0.25)",
                }}
              >
                <PhoneCall size={14} /> Student Callbacks & Pipeline Hub
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>
              Follow-up Planner & Calling Desk
            </h1>
            <p
              style={{
                margin: "6px 0 0 0",
                color: "#94a3b8",
                fontSize: "13.5px",
              }}
            >
              Plan student conversations, complete instant callbacks, log remarks, and convert leads directly into admissions.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleExportFollowupsCsv}
              style={{
                height: "40px",
                padding: "0 16px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(leadsPath)}
              style={{
                height: "40px",
                padding: "0 18px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: "#2563EB",
                color: "#ffffff",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                border: "none",
                boxShadow: "0 2px 10px rgba(37, 99, 235, 0.3)",
              }}
            >
              <span>
                {isAdmin ? "Go to All Leads Pipeline" : "Go to My Leads Pipeline"}
              </span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid — Professional Executive Palette */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        {/* Card 1: Due Today */}
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Clock3 size={20} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                Due Today
              </span>
              <h3
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#0F172A",
                  margin: "2px 0 0 0",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {loading ? "—" : formatNumber(stats.dueToday)}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 2: Overdue Callbacks */}
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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
                flexShrink: 0,
              }}
            >
              <TimerReset size={20} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                Overdue Callbacks
              </span>
              <h3
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#DC2626",
                  margin: "2px 0 0 0",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {loading ? "—" : formatNumber(stats.overdue)}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 3: Completed Calls */}
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#ECFDF5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                Completed Calls
              </span>
              <h3
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#059669",
                  margin: "2px 0 0 0",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {loading ? "—" : formatNumber(stats.completed)}
              </h3>
            </div>
          </div>
        </div>

        {/* Card 4: Total Pending */}
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                height: "42px",
                width: "42px",
                borderRadius: "10px",
                backgroundColor: "#F1F5F9",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PhoneCall size={20} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                Total Pending
              </span>
              <h3
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#0F172A",
                  margin: "2px 0 0 0",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.1,
                }}
              >
                {loading ? "—" : formatNumber(stats.upcoming)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "14px 18px",
          marginBottom: "20px",
          border: "1px solid #E2E8F0",
          display: "flex",
          gap: "14px",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <Search
            size={17}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#64748B",
            }}
          />
          <input
            type="text"
            placeholder="Search student name, mobile, course, or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px 9px 40px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              fontSize: "13.5px",
              outline: "none",
              color: "#0F172A",
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: "2px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <Filter
            size={14}
            style={{ color: "#64748B", marginRight: "4px", flexShrink: 0 }}
          />
          {["All", "Due Today", "Overdue", "Upcoming", "Completed / Closed"].map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  fontWeight: activeFilter === tab ? 600 : 500,
                  border:
                    activeFilter === tab
                      ? "1px solid #2563EB"
                      : "1px solid #E2E8F0",
                  cursor: "pointer",
                  backgroundColor: activeFilter === tab ? "#2563EB" : "#FFFFFF",
                  color: activeFilter === tab ? "#FFFFFF" : "#475569",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* Followups Data Table */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              fontSize: "14px",
              color: "#64748B",
            }}
          >
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
              margin: "16px",
            }}
          >
            No follow-ups match the selected filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: "850px",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #E2E8F0",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    color: "#475569",
                    textTransform: "uppercase",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Student Lead</th>
                  <th style={{ padding: "12px 16px" }}>Interested Course</th>
                  <th style={{ padding: "12px 16px" }}>Channel</th>
                  <th style={{ padding: "12px 16px" }}>
                    Next Follow-up Schedule
                  </th>
                  <th style={{ padding: "12px 16px" }}>Status / Outcome</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map((item) => {
                  const leadName =
                    item.lead_name || item.full_name || "Student Lead";
                  const mobile = item.mobile || item.lead_mobile || "";
                  const cleanMobile = mobile.replace(/\D/g, "");
                  const isPending =
                    (item.status || "").toUpperCase() === "PENDING";
                  const isCompleted =
                    (item.status || "").toUpperCase() === "COMPLETED";

                  const now = new Date();
                  const targetDate = item.next_followup_at
                    ? new Date(item.next_followup_at)
                    : null;
                  const isItemOverdue =
                    isPending && targetDate && targetDate < now;
                  const isDueToday =
                    isPending &&
                    targetDate &&
                    targetDate.toDateString() === now.toDateString();

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

                  const outcome = (
                    item.outcome ||
                    item.lead_status ||
                    ""
                  ).toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        backgroundColor: "#FFFFFF",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div>
                          <strong
                            style={{
                              fontSize: "13.5px",
                              color: "#0F172A",
                              display: "block",
                            }}
                          >
                            {leadName}
                          </strong>
                          <span style={{ fontSize: "12px", color: "#64748B" }}>
                            {mobile || "No Mobile"}
                          </span>
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#334155",
                        }}
                      >
                        {item.interested_course || "Digital Marketing"}
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: "12.5px",
                          color: "#64748B",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: "#F1F5F9",
                            color: "#475569",
                            border: "1px solid #E2E8F0",
                          }}
                        >
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
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                backgroundColor: isItemOverdue
                                  ? "#FEF2F2"
                                  : isDueToday
                                  ? "#EFF6FF"
                                  : "#F8FAFC",
                                color: isItemOverdue
                                  ? "#DC2626"
                                  : isDueToday
                                  ? "#2563EB"
                                  : "#475569",
                                border: `1px solid ${
                                  isItemOverdue
                                    ? "#FECACA"
                                    : isDueToday
                                    ? "#BFDBFE"
                                    : "#E2E8F0"
                                }`,
                              }}
                            >
                              <Clock size={13} />
                              <span>{scheduleBadge}</span>
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#64748B" }}>
                            Completed on{" "}
                            {new Date(
                              item.updated_at || item.created_at
                            ).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Status / Outcome Column */}
                      <td style={{ padding: "14px 16px" }}>
                        {isPending ? (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: isItemOverdue
                                ? "#FEF2F2"
                                : isDueToday
                                ? "#EFF6FF"
                                : "#F1F5F9",
                              color: isItemOverdue
                                ? "#DC2626"
                                : isDueToday
                                ? "#2563EB"
                                : "#475569",
                              border: `1px solid ${
                                isItemOverdue
                                  ? "#FECACA"
                                  : isDueToday
                                  ? "#BFDBFE"
                                  : "#E2E8F0"
                              }`,
                            }}
                          >
                            {isItemOverdue
                              ? "OVERDUE"
                              : isDueToday
                              ? "DUE TODAY"
                              : "UPCOMING"}
                          </span>
                        ) : outcome === "ENROLLED" ? (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#ECFDF5",
                              color: "#059669",
                              border: "1px solid #A7F3D0",
                            }}
                          >
                            ENROLLED
                          </span>
                        ) : outcome === "NOT_INTERESTED" ? (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#FEF2F2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                            }}
                          >
                            NOT INTERESTED
                          </span>
                        ) : outcome === "WALK_IN" ? (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                            }}
                          >
                            WALKIN
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                              border: "1px solid #E2E8F0",
                            }}
                          >
                            COMPLETED
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "6px",
                          }}
                        >
                          {cleanMobile && (
                            <>
                              <a
                                href={`tel:${cleanMobile}`}
                                title={`Call ${leadName}`}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "#ECFDF5",
                                  color: "#059669",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #A7F3D0",
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
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  backgroundColor: "#EFF6FF",
                                  color: "#2563EB",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid #BFDBFE",
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
                            style={{
                              height: "30px",
                              padding: "0 10px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              backgroundColor: "#2563EB",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              cursor: "pointer",
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Update Callback</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLeadDrawer(item)}
                            title="View Lead Details"
                            style={{
                              height: "30px",
                              width: "30px",
                              padding: 0,
                              backgroundColor: "#F1F5F9",
                              color: "#475569",
                              border: "1px solid #CBD5E1",
                              borderRadius: "6px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
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
