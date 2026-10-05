import React, { useState } from "react";
import {
  X,
  IndianRupee,
  CreditCard,
  Calendar,
  Receipt,
  Send,
  UploadCloud,
  User,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { collectFee } from "../../../services/admissionService";
import FeeReceiptModal from "../../admissions/FeeReceiptModal";

const CollectFeeModal = ({ admission, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !admission) return null;

  const totalFee = Number(admission.total_fee) || 0;
  const currentPaid = Number(admission.paid_fee) || 0;
  const currentPending = Number(admission.pending_fee) || Math.max(0, totalFee - currentPaid);

  // Month default: e.g. "October 2026"
  const currentMonthDefault = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [transactionId, setTransactionId] = useState("");
  const [feeMonth, setFeeMonth] = useState(currentMonthDefault);
  const [fatherName, setFatherName] = useState(admission.father_name || "");
  const [domain, setDomain] = useState(admission.domain || "DizitalAdda");
  const [receiptNo, setReceiptNo] = useState("");
  const [nextDueDate, setNextDueDate] = useState(
    admission.next_due_date ? String(admission.next_due_date).slice(0, 10) : ""
  );
  const [remarks, setRemarks] = useState("");
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal State after payment
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedPayment, setCompletedPayment] = useState(null);
  const [updatedAdmission, setUpdatedAdmission] = useState(null);

  const enteredPaid = Number(amountPaid) || 0;
  const newPending = Math.max(0, currentPending - enteredPaid);

  // Handle Proof Screenshot File Select
  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, JPEG).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result);
      setProofImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProof = () => {
    setProofPreview(null);
    setProofImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountPaid || enteredPaid <= 0) {
      toast.error("Please enter a valid installment amount.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await collectFee(admission.id, {
        amount_paid: enteredPaid,
        receipt_no: receiptNo.trim() || undefined,
        payment_mode: paymentMode,
        transaction_id: transactionId.trim() || null,
        proof_image_url: proofImage || null,
        fee_month: feeMonth.trim() || currentMonthDefault,
        father_name: fatherName.trim() || null,
        domain: domain,
        next_due_date: nextDueDate || null,
        remarks: remarks || `Fee installment of ₹${enteredPaid} collected`,
      });

      const updatedData = res?.data || res;
      setUpdatedAdmission(updatedData);
      setCompletedPayment(
        updatedData?.latest_payment || {
          receipt_no: receiptNo || updatedData?.receipt_no,
          amount: enteredPaid,
          payment_mode: paymentMode,
          transaction_id: transactionId,
          proof_image_url: proofImage,
          fee_month: feeMonth,
          payment_date: new Date().toISOString(),
        }
      );

      toast.success(`₹${enteredPaid.toLocaleString("en-IN")} fee installment recorded!`);
      if (typeof onSuccess === "function") onSuccess();
      
      // Open the generated Fee Receipt modal directly!
      setShowReceipt(true);
    } catch (error) {
      console.error("Fee payment failed:", error);
      toast.error(error?.response?.data?.message || "Failed to record fee payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    onClose();
  };

  return (
    <>
      <div
        className="crm-drawer-backdrop"
        style={{
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          className="crm-card"
          style={{
            width: "100%",
            maxWidth: "580px",
            maxHeight: "92vh",
            overflowY: "auto",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            padding: "24px",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "#DCFCE7",
                  color: "#16A34A",
                }}
              >
                <CreditCard size={22} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 800,
                    color: "#0F172A",
                    margin: 0,
                  }}
                >
                  Collect Fee & Generate Receipt
                </h3>
                <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
                  Student: <strong>{admission.student_name}</strong> ({admission.admission_code})
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="crm-close-btn">
              <X size={20} />
            </button>
          </div>

          {/* Current Fee Summary Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              backgroundColor: "#F8FAFC",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748B",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Total Fee
              </span>
              <strong
                style={{ display: "block", fontSize: "14px", color: "#0F172A" }}
              >
                ₹{totalFee.toLocaleString("en-IN")}
              </strong>
            </div>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#16A34A",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Paid So Far
              </span>
              <strong
                style={{ display: "block", fontSize: "14px", color: "#16A34A" }}
              >
                ₹{currentPaid.toLocaleString("en-IN")}
              </strong>
            </div>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#DC2626",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                Current Due
              </span>
              <strong
                style={{ display: "block", fontSize: "14px", color: "#DC2626" }}
              >
                ₹{currentPending.toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Row 1: Amount & Payment Mode */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Installment Amount (₹) <span className="crm-required">*</span>
                </label>
                <div className="crm-input-wrapper">
                  <IndianRupee size={16} className="crm-input-icon" />
                  <input
                    type="number"
                    placeholder="e.g. 15833"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="crm-input has-icon"
                    required
                    max={currentPending}
                    min="1"
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Payment Mode <span className="crm-required">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="crm-select"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="ONLINE">Online Portal / Gateway</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
            </div>

            {/* Row 2: Online Details / RR No. & Fee Month */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Transaction / RR / UTR No.
                </label>
                <div className="crm-input-wrapper">
                  <Receipt size={16} className="crm-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. UPI / RR-89410294"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="crm-input has-icon"
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Fee Month(s)
                </label>
                <div className="crm-input-wrapper">
                  <Calendar size={16} className="crm-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. October 2026"
                    value={feeMonth}
                    onChange={(e) => setFeeMonth(e.target.value)}
                    className="crm-input has-icon"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Father's Name & Domain/Branding */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Father's / Husband Name
                </label>
                <div className="crm-input-wrapper">
                  <User size={16} className="crm-input-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Mr. Ajay Gupta"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="crm-input has-icon"
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Receipt Domain Brand
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="crm-select"
                >
                  <option value="DizitalAdda">Dizital Adda</option>
                  <option value="nigape">NIGAPE (Gen AI)</option>
                  <option value="nidads">NIDADS</option>
                </select>
              </div>
            </div>

            {/* Payment Proof Screenshot Upload Box */}
            <div className="crm-field">
              <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                Payment Proof Screenshot (Online Receipt / Slip)
              </label>

              {proofPreview ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <img
                    src={proofPreview}
                    alt="Proof Preview"
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>
                      Screenshot Attached
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      Ready to attach with payment record
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveProof}
                    style={{
                      background: "#FEE2E2",
                      border: "none",
                      color: "#DC2626",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "2px dashed #CBD5E1",
                    backgroundColor: "#F8FAFC",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <UploadCloud size={24} style={{ color: "#64748B", marginBottom: "4px" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                    Click to upload payment screenshot
                  </span>
                  <span style={{ fontSize: "11px", color: "#94A3B8" }}>
                    Supports PNG, JPG, JPEG (Up to 10MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* Next Due Date & Remarks */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Next Due Date (If Balance Remains)
                </label>
                <div className="crm-input-wrapper">
                  <Calendar size={16} className="crm-input-icon" />
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="crm-input has-icon"
                  />
                </div>
              </div>

              <div className="crm-field">
                <label className="crm-label" style={{ fontWeight: 600, fontSize: "13px" }}>
                  Custom Receipt No. (Optional)
                </label>
                <div className="crm-input-wrapper">
                  <Receipt size={16} className="crm-input-icon" />
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="crm-input has-icon"
                  />
                </div>
              </div>
            </div>

            {/* New Pending Recalculation Badge */}
            <div
              style={{
                padding: "12px",
                backgroundColor: "#EFF6FF",
                borderRadius: "10px",
                border: "1px solid #BFDBFE",
                fontSize: "13px",
                color: "#1E40AF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>Remaining Balance After Payment:</span>
              <strong
                style={{
                  fontSize: "15px",
                  color: newPending === 0 ? "#16A34A" : "#DC2626",
                }}
              >
                ₹{newPending.toLocaleString("en-IN")}{" "}
                {newPending === 0 ? "(FULLY PAID)" : ""}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "4px",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="crm-btn-secondary"
                style={{ height: "42px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="crm-btn-primary"
                style={{
                  height: "42px",
                  padding: "0 22px",
                  backgroundColor: "#16A34A",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Send size={16} />
                <span>{submitting ? "Processing..." : "Confirm & View Receipt"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Instant Generated Fee Receipt Modal */}
      {showReceipt && updatedAdmission && (
        <FeeReceiptModal
          isOpen={showReceipt}
          onClose={handleReceiptClose}
          admission={updatedAdmission}
          payment={completedPayment}
        />
      )}
    </>
  );
};

export default CollectFeeModal;
