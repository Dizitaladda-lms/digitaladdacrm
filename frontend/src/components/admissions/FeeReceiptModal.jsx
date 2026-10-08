import { useRef } from "react";
import {
  X,
  Printer,
  Share2,
  CheckCircle,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import dizitalAddaLogo from "../../assets/logo/dizitaladda-logo.png";
import { numberToWordsINR } from "../../utils/numberToWordsINR";
import "./FeeReceiptModal.css";

/**
 * Domain Configurations for dynamic receipt styling and branding
 */
const DOMAIN_CONFIGS = {
  nipage: {
    key: "nipage",
    brandName: "National Institute of GEN AI & Prompt Engineering",
    shortName: "nigape",
    phone: "+91 8810606010",
    email: "info@nigape.com",
    website: "www.dizitaladda.com",
    address:
      "2nd Floor, Spacetime Management Pvt Ltd Design House, Inder Mohan Bhardwaj Marg, opposite Savitri Cinema Complex, Block E, New, Greater Kailash, New Delhi, Delhi 110048.",
    prefix: "ECGAIPE - ",
  },
  nigape: {
    key: "nigape",
    brandName: "National Institute of GEN AI & Prompt Engineering",
    shortName: "nigape",
    phone: "+91 8810606010",
    email: "info@nigape.com",
    website: "www.dizitaladda.com",
    address:
      "2nd Floor, Spacetime Management Pvt Ltd Design House, Inder Mohan Bhardwaj Marg, opposite Savitri Cinema Complex, Block E, New, Greater Kailash, New Delhi, Delhi 110048.",
    prefix: "ECGAIPE - ",
  },
  dizitaladda: {
    key: "dizitaladda",
    brandName: "Dizital Adda - Institute of Digital Marketing",
    shortName: "Dizital Adda",
    phone: "+91 8810606010",
    email: "info@dizitaladda.com",
    website: "www.dizitaladda.com",
    address:
      "2nd Floor, Spacetime Management Pvt Ltd Design House, Inder Mohan Bhardwaj Marg, opposite Savitri Cinema Complex, Block E, New, Greater Kailash, New Delhi, Delhi 110048.",
    prefix: "DA - ",
  },
  nidads: {
    key: "nidads",
    brandName: "NIDADS - National Institute of Digital Art & Design Skills",
    shortName: "NIDADS",
    phone: "+91 8810606010",
    email: "info@nidads.com",
    website: "www.nidads.com",
    address:
      "2nd Floor, Spacetime Management Pvt Ltd Design House, Inder Mohan Bhardwaj Marg, opposite Savitri Cinema Complex, Block E, New, Greater Kailash, New Delhi, Delhi 110048.",
    prefix: "NIDADS - ",
  },
};

const getDomainConfig = (domainStr) => {
  const normalized = String(domainStr || "dizitaladda").toLowerCase().trim();
  if (normalized.includes("nipage") || normalized.includes("nigape") || normalized.includes("gen ai") || normalized.includes("ai")) {
    return DOMAIN_CONFIGS.nigape;
  }
  if (normalized.includes("nidads") || normalized.includes("design") || normalized.includes("animation")) {
    return DOMAIN_CONFIGS.nidads;
  }
  return DOMAIN_CONFIGS.dizitaladda;
};

const FeeReceiptModal = ({ isOpen, onClose, admission, payment }) => {
  const receiptRef = useRef(null);

  if (!isOpen || !admission) return null;

  // Extract payment details
  const currentPayment = payment || admission.latest_payment || (admission.payments && admission.payments[0]) || {};
  const studentDomain = currentPayment.domain || admission.domain || "nigape";
  const brand = getDomainConfig(studentDomain);

  // Compute values
  const receiptNo =
    currentPayment.receipt_no ||
    currentPayment.receipt_number ||
    admission.receipt_no ||
    `${brand.prefix}${String(admission.admission_code || admission.id || "Pending").slice(-7)}`;

  const paymentDate = currentPayment.payment_date
    ? new Date(currentPayment.payment_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const studentName = admission.student_name || "Student";
  const fatherName = admission.father_name || currentPayment.father_name || "—";
  const courseName = admission.course_name || "Professional Certification";
  
  // Fee Month
  const feeMonth =
    currentPayment.fee_month ||
    new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const totalCourseFee = Number(admission.total_fee || 0);
  const amountPaidNow = Number(
    currentPayment.amount ||
    currentPayment.amount_paid ||
    admission.paid_fee ||
    0
  );

  // Remaining balance
  const remainingBalance =
    admission.pending_fee !== undefined
      ? Number(admission.pending_fee)
      : Math.max(0, totalCourseFee - Number(admission.paid_fee || amountPaidNow));

  const paidBeforeThisPayment = Math.max(
    0,
    Number(admission.paid_fee || amountPaidNow) - amountPaidNow
  );
  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const amountInWords = numberToWordsINR(amountPaidNow);

  const paymentMode = (currentPayment.payment_mode || admission.payment_mode || "ONLINE").toUpperCase();
  const transactionId = currentPayment.transaction_id || currentPayment.rr_no || "UPI";
  const proofImageUrl = currentPayment.proof_image_url || null;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Send function
  const handleWhatsAppSend = () => {
    const rawMobile = String(admission.mobile || "").replace(/[^0-9]/g, "");
    const phone = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;

    const message =
`*COURSE FEE PAYMENT INVOICE*
*${brand.brandName}*

*Invoice / Receipt:* ${receiptNo}
*Admission / Order ID:* ${admission.admission_code || admission.id || "—"}
*Payment date:* ${paymentDate}

*Bill to:* ${studentName}
${fatherName && fatherName !== "—" ? `*Parent/Guardian:* ${fatherName}\n` : ""}*Phone:* ${admission.mobile || "—"}
*Course:* ${courseName}
*Fee period:* ${feeMonth}

*Course fee:* ${formatCurrency(totalCourseFee)}
*Paid before this payment:* ${formatCurrency(paidBeforeThisPayment)}
*Paid in this transaction:* ${formatCurrency(amountPaidNow)}
*Balance due:* ${formatCurrency(remainingBalance)}
*Payment status:* ${remainingBalance <= 0 ? "PAID" : "PARTIALLY PAID"}

*Payment method:* ${paymentMode}
*Transaction reference:* ${transactionId}
*Amount in words:* ${amountInWords}

${brand.address}
${brand.phone} | ${brand.email} | ${brand.website}

Computer-generated payment receipt. This document records the payment received against the course fee; it is not a tax invoice.`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="fee-receipt-backdrop">
      <div className="fee-receipt-modal-container">
        {/* Top Control Bar (Hidden during printing) */}
        <div className="fee-receipt-actions-bar no-print">
          <div className="receipt-brand-badge">
            <CheckCircle size={16} className="text-emerald-500" />
            <span>Official Receipt Generated ({brand.shortName})</span>
          </div>

          <div className="receipt-buttons-group">
            <button
              type="button"
              className="receipt-btn-whatsapp"
              onClick={handleWhatsAppSend}
              title="Send Fee Receipt details to Student WhatsApp"
            >
              <Share2 size={16} />
              <span>Send to WhatsApp</span>
            </button>

            <button
              type="button"
              className="receipt-btn-print"
              onClick={handlePrint}
              title="Print or Save PDF"
            >
              <Printer size={16} />
              <span>Print / Download PDF</span>
            </button>

            <button
              type="button"
              className="receipt-btn-close"
              onClick={onClose}
              title="Close Receipt"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable course-fee invoice */}
        <div className="printable-receipt-card" ref={receiptRef}>
          <article className="order-invoice">
            <header className="order-invoice-header">
              <div className="order-invoice-brand">
                <img src={dizitalAddaLogo} alt={brand.brandName} />
                <div>
                  <strong>{brand.brandName}</strong>
                  <span>{brand.website}</span>
                </div>
              </div>
              <div className="order-invoice-heading">
                <span className="invoice-kicker">PAYMENT CONFIRMATION</span>
                <h1>Course fee invoice</h1>
                <span className={`invoice-status ${remainingBalance <= 0 ? "is-paid" : "is-partial"}`}>
                  <CheckCircle size={14} />
                  {remainingBalance <= 0 ? "Paid in full" : "Partially paid"}
                </span>
              </div>
            </header>

            <section className="invoice-order-meta" aria-label="Order details">
              <div><span>Invoice / receipt</span><strong>{receiptNo}</strong></div>
              <div><span>Admission / order ID</span><strong>{admission.admission_code || admission.id || "—"}</strong></div>
              <div><span>Payment date</span><strong>{paymentDate}</strong></div>
              <div><span>Fee period</span><strong>{feeMonth}</strong></div>
            </section>

            <section className="invoice-parties">
              <div className="invoice-party">
                <span className="invoice-section-label">BILL TO</span>
                <strong>{studentName}</strong>
                {fatherName !== "—" && <span>Parent / guardian: {fatherName}</span>}
                {admission.mobile && <span>Phone: {admission.mobile}</span>}
                {admission.email && <span>Email: {admission.email}</span>}
                {admission.campus_centre && <span>Centre: {admission.campus_centre}</span>}
              </div>
              <div className="invoice-party">
                <span className="invoice-section-label">SOLD BY</span>
                <strong>{brand.brandName}</strong>
                <span>{brand.address}</span>
                <span>{brand.phone}</span>
                <span>{brand.email}</span>
              </div>
            </section>

            <section className="invoice-items-section">
              <h2>Order items</h2>
              <div className="invoice-table-wrap">
                <table className="invoice-items-table">
                  <thead>
                    <tr>
                      <th>Item description</th>
                      <th>Period</th>
                      <th className="invoice-align-right">Qty</th>
                      <th className="invoice-align-right">Course fee</th>
                      <th className="invoice-align-right">Item total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>{courseName}</strong>
                        <span>Course / educational services</span>
                      </td>
                      <td>{feeMonth}</td>
                      <td className="invoice-align-right">1</td>
                      <td className="invoice-align-right">{formatCurrency(totalCourseFee)}</td>
                      <td className="invoice-align-right invoice-item-total">{formatCurrency(totalCourseFee)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="invoice-summary">
              <div className="invoice-payment-details">
                <h2>Payment details</h2>
                <div><span>Payment method</span><strong>{paymentMode}</strong></div>
                <div><span>Transaction reference</span><strong>{transactionId}</strong></div>
                <div><span>Amount in words</span><strong>{amountInWords}</strong></div>
              </div>
              <div className="invoice-totals">
                <div><span>Course fee total</span><strong>{formatCurrency(totalCourseFee)}</strong></div>
                <div><span>Paid before this payment</span><strong>{formatCurrency(paidBeforeThisPayment)}</strong></div>
                <div className="invoice-paid-row"><span>Paid in this transaction</span><strong>{formatCurrency(amountPaidNow)}</strong></div>
                <div className="invoice-balance-row"><span>Balance due</span><strong>{formatCurrency(remainingBalance)}</strong></div>
                <small>Payment received against the course fee</small>
              </div>
            </section>

            <footer className="invoice-footer">
              <div>
                <strong>Thank you for your payment.</strong>
                <span>This computer-generated receipt confirms the payment received for the course listed above.</span>
                <span>This is a payment receipt, not a tax invoice. No tax amount is represented here.</span>
              </div>
              <span className="invoice-footer-contact">{brand.phone} · {brand.email} · {brand.website}</span>
            </footer>
          </article>
        </div>

        {/* Payment Screenshot Proof Card (if available) - Hidden in Print */}
        {proofImageUrl && (
          <div className="payment-proof-preview-card no-print">
            <div className="proof-header">
              <div className="proof-title">
                <ImageIcon size={18} />
                <span>Uploaded Online Payment Proof / Screenshot</span>
              </div>
              <a
                href={proofImageUrl}
                target="_blank"
                rel="noreferrer"
                className="proof-download-link"
              >
                <ExternalLink size={14} /> Open Full Size
              </a>
            </div>
            <div className="proof-image-wrapper">
              <img
                src={proofImageUrl}
                alt="Payment Proof Screenshot"
                className="proof-img"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeReceiptModal;
