import React, { useState } from "react";
import {
  Receipt,
  CheckCircle,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  DollarSign,
  Copy,
  Check,
  Eye,
  X,
  CreditCard,
  Building,
  User,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";
import "./LeadDetailsDrawer.css";

const LeadFeeLedgerTab = ({ lead, onOpenReceipt }) => {
  const [selectedProofUrl, setSelectedProofUrl] = useState(null);
  const [copiedTxnId, setCopiedTxnId] = useState(null);

  const admission = lead?.admission;
  const payments = admission?.payments || (admission?.latest_payment ? [admission.latest_payment] : []);

  const totalFee = Number(admission?.total_fee || lead?.total_fee || 0);
  const paidFee = Number(admission?.paid_fee || lead?.paid_fee || 0);
  const pendingFee = Math.max(0, totalFee - paidFee);

  const handleCopyTxn = (txnId) => {
    if (!txnId) return;
    navigator.clipboard.writeText(txnId);
    setCopiedTxnId(txnId);
    toast.success("Transaction ID copied! 📋");
    setTimeout(() => setCopiedTxnId(null), 2500);
  };

  return (
    <div className="lead-fee-ledger-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Proof Preview Modal */}
      {selectedProofUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedProofUrl(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "600px",
              maxHeight: "90vh",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ImageIcon size={18} style={{ color: "#2563EB" }} />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>Payment Proof Screenshot</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofUrl(null)}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px",
                  cursor: "pointer",
                  color: "#64748B",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ textAlign: "center", overflow: "auto", maxHeight: "calc(90vh - 100px)" }}>
              <img
                src={selectedProofUrl}
                alt="Payment Proof"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }}
              />
            </div>
            <div style={{ marginTop: "12px", textAlign: "right" }}>
              <a
                href={selectedProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                  color: "#2563EB",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Open in Full Tab <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header Info Strip */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "14px",
          padding: "18px 20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  border: "1px solid #BFDBFE",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                {admission?.admission_code || "ENROLLED STUDENT"}
              </span>
              <span
                style={{
                  background: "#F0FDF4",
                  color: "#166534",
                  border: "1px solid #BBF7D0",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                }}
              >
                Domain: {admission?.domain || lead?.domain || "DizitalAdda"}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 750, color: "#0F172A" }}>
              {admission?.student_name || lead?.full_name}
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "#64748B", fontSize: "13px" }}>
              <strong>Course:</strong> {admission?.course_name || lead?.interested_course || "Course N/A"}{" "}
              {admission?.father_name && (
                <>
                  <span style={{ color: "#CBD5E1", margin: "0 6px" }}>•</span>
                  <strong>Father's Name:</strong> {admission.father_name}
                </>
              )}
            </p>
          </div>

          {admission && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Admission Status
              </span>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "3px",
                  background: pendingFee === 0 ? "#ECFDF5" : "#EFF6FF",
                  color: pendingFee === 0 ? "#059669" : "#2563EB",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <CheckCircle size={14} />
                <span>{pendingFee === 0 ? "FEE FULLY PAID" : "ACTIVE ADMISSION"}</span>
              </div>
            </div>
          )}
        </div>

        {/* 3 Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
            marginTop: "16px",
            paddingTop: "16px",
            borderTop: "1px solid #F1F5F9",
          }}
        >
          <div style={{ background: "#F8FAFC", padding: "12px 14px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>Total Course Fee</span>
            <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: 800, color: "#0F172A" }}>
              ₹{totalFee.toLocaleString("en-IN")}
            </p>
          </div>

          <div style={{ background: "#F0FDF4", padding: "12px 14px", borderRadius: "10px", border: "1px solid #BBF7D0" }}>
            <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Total Paid (Verified)</span>
            <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: 800, color: "#16A34A" }}>
              ₹{paidFee.toLocaleString("en-IN")}
            </p>
          </div>

          <div
            style={{
              background: pendingFee > 0 ? "#FFFBEB" : "#F8FAFC",
              padding: "12px 14px",
              borderRadius: "10px",
              border: pendingFee > 0 ? "1px solid #FDE68A" : "1px solid #E2E8F0",
            }}
          >
            <span style={{ fontSize: "11px", color: pendingFee > 0 ? "#92400E" : "#64748B", fontWeight: 600, textTransform: "uppercase" }}>
              Remaining Due
            </span>
            <p style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: 800, color: pendingFee > 0 ? "#D97706" : "#64748B" }}>
              ₹{pendingFee.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Installments History */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "14px",
          padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 750, color: "#0F172A" }}>
              Fee Installment Payments & Proofs ({payments.length})
            </h4>
            <p style={{ margin: "2px 0 0 0", color: "#64748B", fontSize: "12.5px" }}>
              Complete audit ledger of payment dates, transaction IDs, proof screenshots, and official receipts.
            </p>
          </div>

          {payments.length > 0 && (
            <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600, background: "#ECFDF5", padding: "4px 10px", borderRadius: "12px" }}>
              ✓ All records verified
            </span>
          )}
        </div>

        {payments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "36px 20px",
              background: "#F8FAFC",
              borderRadius: "12px",
              border: "1.5px dashed #CBD5E1",
            }}
          >
            <Receipt size={36} style={{ color: "#94A3B8", margin: "0 auto 10px auto" }} />
            <h5 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "#334155" }}>
              No Fee Installments Recorded Yet
            </h5>
            <p style={{ margin: "6px auto 0 auto", maxWidth: "420px", fontSize: "12.5px", color: "#64748B", lineHeight: "1.4" }}>
              This lead is enrolled. As soon as the counsellor or accounts department logs a fee installment with proof screenshot, the complete ledger will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Date</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Receipt #</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Mode</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Transaction ID</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700 }}>Payment Proof</th>
                  <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "center" }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay, idx) => {
                  const payDate = pay.payment_date
                    ? new Date(pay.payment_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  const amt = Number(pay.amount || pay.amount_paid || 0);

                  return (
                    <tr
                      key={pay.id || idx}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                        {payDate}
                        {pay.fee_month && (
                          <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 500 }}>
                            Month: {pay.fee_month}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px", fontWeight: 700, color: "#2563EB", whiteSpace: "nowrap" }}>
                        {pay.receipt_no || admission?.receipt_no || "DA-RCPT"}
                      </td>

                      <td style={{ padding: "12px", fontWeight: 800, color: "#059669", whiteSpace: "nowrap" }}>
                        ₹{amt.toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            background: "#F1F5F9",
                            color: "#334155",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {pay.payment_mode || "ONLINE"}
                        </span>
                      </td>

                      <td style={{ padding: "12px" }}>
                        {pay.transaction_id ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <code
                              style={{
                                background: "#F8FAFC",
                                border: "1px solid #E2E8F0",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "11.5px",
                                color: "#0F172A",
                                fontFamily: "monospace",
                              }}
                            >
                              {pay.transaction_id}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyTxn(pay.transaction_id)}
                              title="Copy Transaction ID"
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                color: copiedTxnId === pay.transaction_id ? "#059669" : "#64748B",
                                padding: "2px",
                              }}
                            >
                              {copiedTxnId === pay.transaction_id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "12px" }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {pay.proof_image_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProofUrl(pay.proof_image_url)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              background: "#EFF6FF",
                              border: "1px solid #BFDBFE",
                              color: "#1D4ED8",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <ImageIcon size={14} /> View Proof
                          </button>
                        ) : (
                          <span style={{ color: "#94A3B8", fontSize: "12px" }}>No Screenshot</span>
                        )}
                      </td>

                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt && onOpenReceipt(admission, pay)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 12px",
                            borderRadius: "8px",
                            background: "#2563EB",
                            border: "none",
                            color: "#FFFFFF",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)",
                          }}
                        >
                          <Receipt size={13} /> Official Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadFeeLedgerTab;
