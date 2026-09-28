import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  IndianRupee,
  CreditCard,
  CheckCircle2,
  Phone,
  MessageCircle,
  Eye,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import CollectFeeModal from "../../components/employee/admissions/CollectFeeModal";
import LeadDetailsDrawer from "../../components/common/LeadDetailsDrawer/LeadDetailsDrawer";
import { getAdmissions } from "../../services/admissionService";
import { exportToCsv } from "../../utils/exportCsv";
import { useAuth } from "../../context/AuthContext";

const MyAdmissions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const leadsPath = isAdmin ? "/leads" : "/employee/leads";
  const followupsPath = isAdmin ? "/followups" : "/employee/followups";
  const [admissions, setAdmissions] = useState([]);
  const [summary, setSummary] = useState({
    total_admissions: 0,
    total_revenue: 0,
    total_paid: 0,
    total_pending: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // Modal & Drawer State
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);

  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);

  const loadAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdmissions({ search, limit: 100 });
      const data = res.data || res;
      setAdmissions(data.admissions || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to load admissions:", error);
      toast.error(error?.response?.data?.message || "Could not load admissions ledger.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadAdmissions();
  }, [loadAdmissions]);

  // Tab Filtering
  const filteredAdmissions = useMemo(() => {
    if (activeTab === "Pending Fee Dues") {
      return admissions.filter((a) => Number(a.pending_fee) > 0);
    }
    if (activeTab === "Fully Paid") {
      return admissions.filter((a) => Number(a.pending_fee) === 0);
    }
    return admissions;
  }, [admissions, activeTab]);

  const handleOpenFeeModal = (admission) => {
    setSelectedAdmission(admission);
    setIsFeeModalOpen(true);
  };

  const handleOpenLeadDrawer = (admission) => {
    setSelectedLead({
      id: admission.lead_id || admission.id,
      lead_code: admission.admission_code || "ADM1001",
      full_name: admission.student_name,
      mobile: admission.mobile,
      email: admission.email,
      interested_course: admission.course_name,
      status: "ENROLLED",
    });
    setIsLeadDrawerOpen(true);
  };

  const getFeeReminderWhatsAppUrl = (item) => {
    const cleanMobile = (item.mobile || "").replace(/\D/g, "");
    if (!cleanMobile) return "#";
    const dueDateStr = item.next_due_date
      ? new Date(item.next_due_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "as soon as possible";

    const messageText = `Hello ${item.student_name}! 👋\n\nThis is a friendly reminder from Dizital Adda Admissions Office regarding your pending fee installment of ₹${Number(item.pending_fee || 0).toLocaleString("en-IN")} for ${item.course_name || "your course"}.\n\nReceipt Reference: ${item.receipt_no || "N/A"}\nDue Date: ${dueDateStr}\n\nKindly complete the fee payment to avoid any delay. Feel free to reply here if you have any questions.\n\nThank you,\nDizital Adda Admissions Team`;

    return `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(messageText)}`;
  };

  const handleExportAdmissionsCsv = () => {
    exportToCsv(
      `Dizital_Adda_Admissions_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: "Admission Code", key: "admission_code" },
        { header: "Student Name", key: "student_name" },
        { header: "Mobile", key: "mobile" },
        { header: "Email", key: "email" },
        { header: "Course Name", key: "course_name" },
        { header: "Campus Centre", key: "campus_centre" },
        { header: "Total Fee (₹)", key: "total_fee" },
        { header: "Paid Fee (₹)", key: "paid_fee" },
        { header: "Pending Fee (₹)", key: "pending_fee" },
        { header: "Receipt No", key: "receipt_no" },
        { header: "Next Due Date", key: "next_due_date" },
        { header: "Status", key: "status" },
      ],
      filteredAdmissions
    );
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Banner Header */}
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
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
            Admissions & Fee Ledger
          </h1>
          <p style={{ fontSize: "13px", color: "#64748B", margin: "4px 0 0 0", fontWeight: 500 }}>
            Track enrolled students, manage fee installments, record receipts, and monitor outstanding dues
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleExportAdmissionsCsv}
            className="crm-btn-secondary"
            style={{ height: "42px", backgroundColor: "#F1F5F9" }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(leadsPath)}
            className="crm-btn-secondary"
            style={{ height: "42px" }}
          >
            <span>{isAdmin ? "All Leads Pipeline" : "My Leads Pipeline"}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(followupsPath)}
            className="crm-btn-primary"
            style={{ height: "42px", padding: "0 18px", fontSize: "13px" }}
          >
            <span>Follow-up Planner</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 4 Live Summary Metric Cards */}
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
                backgroundColor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Total Enrolled Students
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {loading ? "—" : summary.total_admissions}
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
              <IndianRupee size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Total Revenue Collected
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#16A34A", margin: 0 }}>
                {loading ? "—" : `₹${Number(summary.total_paid || 0).toLocaleString("en-IN")}`}
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
              <CreditCard size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Total Outstanding Dues
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#DC2626", margin: 0 }}>
                {loading ? "—" : `₹${Number(summary.total_pending || 0).toLocaleString("en-IN")}`}
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
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                Expected Total Fee
              </span>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#0F172A", margin: 0 }}>
                {loading ? "—" : `₹${Number(summary.total_revenue || 0).toLocaleString("en-IN")}`}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Search Input */}
        <div className="crm-input-wrapper" style={{ width: "320px" }}>
          <Search size={16} className="crm-input-icon" />
          <input
            type="text"
            placeholder="Search student, mobile, receipt #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-input has-icon"
            style={{ height: "42px" }}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} style={{ color: "#64748B", marginRight: "4px" }} />
          {["All", "Pending Fee Dues", "Fully Paid"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                border: "1px solid #E2E8F0",
                cursor: "pointer",
                backgroundColor: activeTab === tab ? "#2563EB" : "#FFFFFF",
                color: activeTab === tab ? "#FFFFFF" : "#64748B",
                transition: "all 0.2s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Admissions Data Table */}
      <div className="crm-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", fontSize: "14px", color: "#64748B" }}>
            Loading student admissions ledger...
          </div>
        ) : filteredAdmissions.length === 0 ? (
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
            No admissions record matches your search or filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E2E8F0", fontSize: "12px", color: "#64748B", textTransform: "uppercase" }}>
                  <th style={{ padding: "14px 16px" }}>Student & Code</th>
                  <th style={{ padding: "14px 16px" }}>Course & Campus</th>
                  <th style={{ padding: "14px 16px" }}>Total Fee</th>
                  <th style={{ padding: "14px 16px" }}>Paid Fee</th>
                  <th style={{ padding: "14px 16px" }}>Pending Due</th>
                  <th style={{ padding: "14px 16px" }}>Receipt #</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.map((item) => {
                  const total = Number(item.total_fee) || 0;
                  const paid = Number(item.paid_fee) || 0;
                  const pending = Number(item.pending_fee) || Math.max(0, total - paid);
                  const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  const cleanMobile = (item.mobile || "").replace(/\D/g, "");

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ fontSize: "14px", color: "#0F172A", display: "block" }}>
                          {item.student_name}
                        </strong>
                        <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: 600 }}>
                          {item.admission_code || "ADM1001"}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748B", display: "block" }}>
                          {item.mobile}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ fontSize: "13px", color: "#334155", display: "block" }}>
                          {item.course_name || "BCA"}
                        </strong>
                        <span style={{ fontSize: "12px", color: "#64748B" }}>
                          {item.campus_centre || "Main Campus"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "#0F172A" }}>
                        ₹{total.toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ fontSize: "13px", color: "#16A34A", display: "block" }}>
                          ₹{paid.toLocaleString("en-IN")}
                        </strong>
                        {/* Progress Bar */}
                        <div style={{ height: "4px", width: "80px", backgroundColor: "#E2E8F0", borderRadius: "2px", marginTop: "4px" }}>
                          <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: "#16A34A", borderRadius: "2px" }} />
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <strong style={{ fontSize: "13px", color: pending === 0 ? "#16A34A" : "#DC2626" }}>
                          {pending === 0 ? "₹0 (PAID)" : `₹${pending.toLocaleString("en-IN")}`}
                        </strong>
                        {item.next_due_date && pending > 0 && (
                          <span style={{ fontSize: "11px", color: "#64748B", display: "block" }}>
                            Due: {new Date(item.next_due_date).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "#64748B", fontFamily: "monospace" }}>
                        {item.receipt_no || "—"}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className={`crm-badge ${
                            pending === 0 ? "crm-badge-low" : "crm-badge-high"
                          }`}
                          style={{ fontSize: "11px" }}
                        >
                          {pending === 0 ? "FULLY PAID" : "PENDING DUE"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          {cleanMobile && (
                            <a
                              href={`tel:${cleanMobile}`}
                              title={`Call ${item.student_name}`}
                              style={{
                                padding: "6px",
                                borderRadius: "8px",
                                backgroundColor: "#DCFCE7",
                                color: "#16A34A",
                                display: "inline-flex",
                              }}
                            >
                              <Phone size={14} />
                            </a>
                          )}

                          {cleanMobile && pending > 0 && (
                            <a
                              href={getFeeReminderWhatsAppUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Send WhatsApp Fee Reminder"
                              style={{
                                padding: "0 10px",
                                height: "32px",
                                borderRadius: "8px",
                                backgroundColor: "#25D366",
                                color: "#FFFFFF",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <MessageCircle size={13} />
                              <span>Fee Reminder</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenFeeModal(item)}
                            title="Collect Fee Installment"
                            className="crm-btn-primary"
                            style={{ height: "32px", padding: "0 10px", fontSize: "11px", backgroundColor: "#16A34A" }}
                          >
                            <Plus size={13} />
                            <span>Collect Fee</span>
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

      {/* Collect Fee Installment Modal */}
      <CollectFeeModal
        admission={selectedAdmission}
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        onSuccess={loadAdmissions}
      />

      {/* Shared Lead Details Drawer */}
      <LeadDetailsDrawer
        open={isLeadDrawerOpen}
        lead={selectedLead}
        onClose={() => setIsLeadDrawerOpen(false)}
        onStatusUpdated={loadAdmissions}
        role="counsellor"
      />
    </div>
  );
};

export default MyAdmissions;
