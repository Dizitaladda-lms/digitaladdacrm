import { useState, useEffect } from "react";
import {
  GraduationCap,
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  MessageCircle,
  Receipt,
  PlusCircle,
  X,
  TrendingUp,
  Download,
  Filter,
  UserCheck,
  PhoneCall,
} from "lucide-react";
import {
  getAdmissions,
  getAdmissionStats,
  addAdmissionPayment,
  getAdmissionDetails,
} from "../../services/admissionService";
import { exportToCSV } from "../../utils/exportCsv";
import "./AdmissionManagement.css";

const AdmissionManagement = () => {
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState({
    total_admissions: 0,
    total_revenue: 0,
    total_collected: 0,
    total_pending: 0,
    overdue_count: 0,
    due_today_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [centreFilter, setCentreFilter] = useState("ALL");

  // Modals state
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLedgerDrawerOpen, setIsLedgerDrawerOpen] = useState(false);
  const [ledgerDetails, setLedgerDetails] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_mode: "UPI",
    receipt_number: "",
    payment_date: new Date().toISOString().slice(0, 10),
    next_due_date: "",
    remarks: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [admRes, statRes] = await Promise.all([
        getAdmissions({
          search,
          feeStatus: statusFilter !== "ALL" && statusFilter !== "OVERDUE" ? statusFilter : undefined,
          isOverdue: statusFilter === "OVERDUE",
          centre: centreFilter !== "ALL" ? centreFilter : undefined,
        }),
        getAdmissionStats(),
      ]);

      const raw = admRes?.data?.admissions || admRes?.data?.data?.admissions || admRes?.data?.data || admRes?.data || [];
      const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.admissions) ? raw.admissions : []);
      setAdmissions(list);
      setStats(statRes?.data || {});
    } catch (err) {
      console.error("Error loading admin admissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, centreFilter]);

  // Open Payment Modal
  const handleOpenPayment = (admission) => {
    setSelectedAdmission(admission);
    setPaymentForm({
      amount: "",
      payment_mode: "UPI",
      receipt_number: `REC-${Date.now().toString().slice(-5)}`,
      payment_date: new Date().toISOString().slice(0, 10),
      next_due_date: admission.next_due_date ? String(admission.next_due_date).slice(0, 10) : "",
      remarks: "",
    });
    setIsPaymentModalOpen(true);
  };

  // Submit Payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      setPaymentSubmitting(true);
      await addAdmissionPayment(selectedAdmission.id, {
        amount: Number(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        receipt_number: paymentForm.receipt_number,
        payment_date: paymentForm.payment_date,
        next_due_date: paymentForm.next_due_date || null,
        remarks: paymentForm.remarks,
      });

      alert("Fee payment recorded successfully!");
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Payment error:", err);
      alert(err?.response?.data?.message || "Failed to record payment.");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Open Ledger History
  const handleOpenLedger = async (admission) => {
    setSelectedAdmission(admission);
    setIsLedgerDrawerOpen(true);
    try {
      const res = await getAdmissionDetails(admission.id);
      setLedgerDetails(res?.data || null);
    } catch (err) {
      console.error("Ledger load error:", err);
    }
  };

  // Send WhatsApp Fee Reminder
  const handleSendWhatsAppReminder = (admission) => {
    const cleanMobile = String(admission.mobile || "").replace(/[^0-9]/g, "");
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

    const dueDateStr = admission.next_due_date
      ? new Date(admission.next_due_date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "as soon as possible";

    const msg = `Dear *${admission.student_name}*,\n\nThis is a gentle fee reminder from *DIZITALADDA* regarding your admission in *${admission.course_name}*.\n\nPending Balance: ₹${Number(admission.pending_fee || 0).toLocaleString("en-IN")}\nDue Date: ${dueDateStr}\n\nKindly clear your pending installment to keep your academic enrollment active.\n\nThank you,\n*DIZITALADDA Admissions Desk*`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!admissions.length) {
      alert("No records to export.");
      return;
    }

    const columns = [
      { label: "Admission ID", key: (r) => r.admission_number || `#${r.id}` },
      { label: "Student Name", key: "student_name" },
      { label: "Mobile Number", key: "mobile" },
      { label: "Email Address", key: "email" },
      { label: "Enrolled Course", key: "course_name" },
      { label: "Centre / Campus", key: (r) => r.centre || "Main Campus" },
      { label: "Total Fee (INR)", key: (r) => Number(r.total_fee || 0) },
      { label: "Paid Fee (INR)", key: (r) => Number(r.paid_fee || 0) },
      { label: "Pending Balance (INR)", key: (r) => Number(r.pending_fee || 0) },
      { label: "Payment Status", key: "fee_status" },
      { label: "Next Due Date", key: (r) => r.next_due_date ? String(r.next_due_date).slice(0, 10) : "N/A" },
      { label: "Assigned Counsellor", key: (r) => r.counsellor_name || "Unassigned" },
      { label: "Enrolled Date", key: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN") : "" },
      { label: "Remarks", key: "remarks" },
    ];

    exportToCSV(admissions, columns, "dizitaladda_admissions_ledger");
  };

  return (
    <div className="adm-admin-container">
      {/* Page Header */}
      <div className="adm-admin-header">
        <div>
          <h1 className="adm-admin-title">
            <GraduationCap className="title-icon" /> Admissions & Revenue Management
          </h1>
          <p className="adm-admin-subtitle">
            Institute-wide student admissions, course fee collection ledger, and automated WhatsApp fee reminders.
          </p>
        </div>

        <button className="btn-export-csv" onClick={handleExportCSV}>
          <Download size={16} /> Export CSV Ledger
        </button>
      </div>

      {/* Financial Analytics Grid */}
      <div className="adm-stats-grid">
        <div
          className={`adm-stat-card active-adm-card ${statusFilter === "ALL" ? "selected" : ""}`}
          onClick={() => setStatusFilter("ALL")}
          role="button"
          tabIndex={0}
          title="Click to view all admissions"
        >
          <div className="adm-stat-icon blue">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="adm-stat-label">Total Enrolled Students</div>
            <div className="adm-stat-value">{stats.total_admissions || 0}</div>
          </div>
        </div>

        <div
          className="adm-stat-card active-adm-card"
          onClick={() => setStatusFilter("ALL")}
          role="button"
          tabIndex={0}
          title="Click to view all admissions"
        >
          <div className="adm-stat-icon purple">
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="adm-stat-label">Total Course Value</div>
            <div className="adm-stat-value">
              ₹{Number(stats.total_revenue || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div
          className={`adm-stat-card active-adm-card ${statusFilter === "FULLY_PAID" ? "selected" : ""}`}
          onClick={() => setStatusFilter("FULLY_PAID")}
          role="button"
          tabIndex={0}
          title="Click to filter Fully Paid admissions"
        >
          <div className="adm-stat-icon green">
            <IndianRupee size={22} />
          </div>
          <div>
            <div className="adm-stat-label">Total Fees Collected</div>
            <div className="adm-stat-value green-text">
              ₹{Number(stats.total_collected || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div
          className={`adm-stat-card active-adm-card ${statusFilter === "PARTIAL" ? "selected" : ""}`}
          onClick={() => setStatusFilter("PARTIAL")}
          role="button"
          tabIndex={0}
          title="Click to filter Partial Dues admissions"
        >
          <div className="adm-stat-icon amber">
            <Clock size={22} />
          </div>
          <div>
            <div className="adm-stat-label">Outstanding Dues</div>
            <div className="adm-stat-value amber-text">
              ₹{Number(stats.total_pending || 0).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div
          className={`adm-stat-card active-adm-card ${statusFilter === "OVERDUE" ? "selected" : ""}`}
          onClick={() => setStatusFilter("OVERDUE")}
          role="button"
          tabIndex={0}
          title="Click to filter Overdue admissions"
        >
          <div className="adm-stat-icon red">
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="adm-stat-label">Overdue Installments</div>
            <div className="adm-stat-value red-text">{stats.overdue_count || 0}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="adm-controls-bar">
        <div className="adm-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by student, mobile, course, counsellor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="adm-filter-pills">
          <button
            className={`filter-pill ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All Students ({admissions.length})
          </button>
          <button
            className={`filter-pill ${statusFilter === "PARTIAL" ? "active" : ""}`}
            onClick={() => setStatusFilter("PARTIAL")}
          >
            Partial Dues
          </button>
          <button
            className={`filter-pill ${statusFilter === "FULLY_PAID" ? "active" : ""}`}
            onClick={() => setStatusFilter("FULLY_PAID")}
          >
            Fully Paid
          </button>
          <button
            className={`filter-pill overdue ${statusFilter === "OVERDUE" ? "active" : ""}`}
            onClick={() => setStatusFilter("OVERDUE")}
          >
            ?? Overdue Dues
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="adm-table-wrapper">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Student Details</th>
              <th>Course & Campus</th>
              <th>Counsellor</th>
              <th>Fee Breakdown</th>
              <th>Status</th>
              <th>Next Due Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="adm-loading">
                  Loading institute admissions & fee ledger...
                </td>
              </tr>
            ) : admissions.length === 0 ? (
              <tr>
                <td colSpan="7" className="adm-empty">
                  No admission records found matching filters.
                </td>
              </tr>
            ) : (
              admissions.map((adm) => {
                const total = Number(adm.total_fee || 0);
                const paid = Number(adm.paid_fee || 0);
                const pending = Number(adm.pending_fee || 0);
                const percentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                const isOverdue =
                  adm.fee_status === "OVERDUE" ||
                  (pending > 0 && adm.next_due_date && new Date(adm.next_due_date) < new Date());

                return (
                  <tr key={adm.id} className={isOverdue ? "row-overdue" : ""}>
                    {/* Student Details */}
                    <td>
                      <div className="student-name">{adm.student_name}</div>
                      <div className="student-contact">
                        <a href={`tel:${adm.mobile}`} className="phone-link">
                          <PhoneCall size={12} /> {adm.mobile}
                        </a>
                      </div>
                      {adm.email && <div className="student-email">{adm.email}</div>}
                    </td>

                    {/* Course & Campus */}
                    <td>
                      <div className="course-name">{adm.course_name}</div>
                      <div className="centre-tag">{adm.centre || "Main Campus"}</div>
                    </td>

                    {/* Counsellor */}
                    <td>
                      <div className="counsellor-tag">
                        <UserCheck size={13} />
                        <span>{adm.counsellor_name || "Unassigned"}</span>
                      </div>
                    </td>

                    {/* Fee Breakdown */}
                    <td>
                      <div className="fee-numbers">
                        <span className="paid-amount">?{paid.toLocaleString("en-IN")}</span>
                        <span className="fee-divider">/</span>
                        <span className="total-amount">?{total.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="fee-progress-bar">
                        <div
                          className={`fee-progress-fill ${isOverdue ? "fill-red" : percentage === 100 ? "fill-green" : "fill-blue"}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="fee-subtext">
                        {pending > 0 ? (
                          <span className="pending-text">?{pending.toLocaleString("en-IN")} pending</span>
                        ) : (
                          <span className="cleared-text">? 100% Cleared</span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {isOverdue ? (
                        <span className="adm-badge badge-overdue">?? Overdue</span>
                      ) : adm.fee_status === "FULLY_PAID" ? (
                        <span className="adm-badge badge-paid">
                          <CheckCircle2 size={13} /> Paid
                        </span>
                      ) : (
                        <span className="adm-badge badge-partial">
                          <Clock size={13} /> Partial
                        </span>
                      )}
                    </td>

                    {/* Next Due Date */}
                    <td>
                      {pending > 0 && adm.next_due_date ? (
                        <div className={`due-date-wrapper ${isOverdue ? "overdue-date" : ""}`}>
                          <Calendar size={14} />
                          <span>
                            {new Date(adm.next_due_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="no-due">�</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="adm-actions">
                        {/* 1. Add Payment */}
                        {pending > 0 && (
                          <button
                            className="btn-adm-pay"
                            title="Record Fee Payment"
                            onClick={() => handleOpenPayment(adm)}
                          >
                            <PlusCircle size={15} /> Collect
                          </button>
                        )}

                        {/* 2. WhatsApp Reminder */}
                        {pending > 0 && (
                          <button
                            className="btn-adm-wa"
                            title="Send WhatsApp Fee Reminder"
                            onClick={() => handleSendWhatsAppReminder(adm)}
                          >
                            <MessageCircle size={15} /> Reminder
                          </button>
                        )}

                        {/* 3. View Ledger */}
                        <button
                          className="btn-adm-ledger"
                          title="View Complete Fee Ledger"
                          onClick={() => handleOpenLedger(adm)}
                        >
                          <Receipt size={15} /> Ledger
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedAdmission && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-card">
            <div className="adm-modal-header">
              <div>
                <h2>Record Fee Payment</h2>
                <p>Student: <strong>{selectedAdmission.student_name}</strong> ({selectedAdmission.course_name})</p>
              </div>
              <button className="btn-close" onClick={() => setIsPaymentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-fee-banner">
              <div>
                <span>Total Course Fee</span>
                <strong>?{Number(selectedAdmission.total_fee || 0).toLocaleString("en-IN")}</strong>
              </div>
              <div>
                <span>Already Paid</span>
                <strong className="green-text">?{Number(selectedAdmission.paid_fee || 0).toLocaleString("en-IN")}</strong>
              </div>
              <div>
                <span>Current Balance Due</span>
                <strong className="amber-text">?{Number(selectedAdmission.pending_fee || 0).toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Installment Amount (?) *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedAdmission.pending_fee}
                    placeholder="Enter amount (e.g. 10000)"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Mode *</label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="ONLINE">Online Portal</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Receipt / Transaction Ref No.</label>
                  <input
                    type="text"
                    placeholder="REC-2026-001"
                    value={paymentForm.receipt_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  />
                </div>
              </div>

              {Number(paymentForm.amount || 0) < Number(selectedAdmission.pending_fee || 0) && (
                <div className="form-group">
                  <label>Next Installment Due Date</label>
                  <input
                    type="date"
                    value={paymentForm.next_due_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, next_due_date: e.target.value })}
                  />
                  <small className="hint">Set deadline for remaining balance.</small>
                </div>
              )}

              <div className="form-group">
                <label>Remarks / Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Second installment payment received..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={paymentSubmitting}>
                  {paymentSubmitting ? "Recording..." : "Record & Update Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger History Drawer */}
      {isLedgerDrawerOpen && selectedAdmission && (
        <div className="adm-drawer-overlay">
          <div className="adm-drawer">
            <div className="adm-drawer-header">
              <div>
                <h2>Student Fee Ledger</h2>
                <p>{selectedAdmission.student_name} � {selectedAdmission.course_name}</p>
              </div>
              <button className="btn-close" onClick={() => setIsLedgerDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="adm-drawer-body">
              <div className="drawer-summary-grid">
                <div className="d-card">
                  <span>Total Course Fee</span>
                  <strong>?{Number(selectedAdmission.total_fee || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div className="d-card green">
                  <span>Total Paid</span>
                  <strong>?{Number(selectedAdmission.paid_fee || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div className="d-card amber">
                  <span>Remaining Due</span>
                  <strong>?{Number(selectedAdmission.pending_fee || 0).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="drawer-section">
                <h3 className="section-heading">
                  <Receipt size={16} /> All Payment Receipts
                </h3>

                {!ledgerDetails || !ledgerDetails.payments || ledgerDetails.payments.length === 0 ? (
                  <p className="no-payments">No payment records logged yet.</p>
                ) : (
                  <div className="transactions-list">
                    {ledgerDetails.payments.map((p, idx) => (
                      <div key={p.id || idx} className="transaction-item">
                        <div className="tx-header">
                          <span className="tx-amount">+ ₹{Number(p.amount).toLocaleString("en-IN")}</span>
                          <span className={`tx-badge ${p.payment_mode === "INITIAL_PAYMENT" ? "initial-token" : ""}`}>
                            {p.payment_mode === "INITIAL_PAYMENT" ? "🌟 Initial Token Fee" : p.payment_mode}
                          </span>
                        </div>
                        <div className="tx-meta">
                          <span>Receipt: <strong>{p.receipt_number || "—"}</strong></span>
                          <span>Date: {new Date(p.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                        {p.remarks && <div className="tx-remarks">"{p.remarks}"</div>}
                        {p.recorded_by_name && (
                          <div className="tx-recorder">Recorded by: {p.recorded_by_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="adm-drawer-footer">
              <button
                className="btn-send-reminder"
                onClick={() => handleSendWhatsAppReminder(selectedAdmission)}
              >
                <MessageCircle size={16} /> Send WhatsApp Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionManagement;
