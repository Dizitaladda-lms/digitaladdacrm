import React, { useRef } from "react";
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
    `${brand.prefix}${Date.now().toString().slice(-7)}`;

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
`*OFFICIAL FEE PAYMENT RECEIPT* 🧾
*----------------------------------------*
*Institute:* ${brand.brandName}
*Receipt No:* ${receiptNo}
*Date:* ${paymentDate}

*Student Name:* ${studentName}
${fatherName && fatherName !== "—" ? `*Father's/Husband Name:* ${fatherName}\n` : ""}*Course Applied:* ${courseName}
*Fee Month(s):* ${feeMonth}
*Course Fee:* ₹${totalCourseFee.toLocaleString("en-IN")}

*----------------------------------------*
*Amount Paid Now:* ₹${amountPaidNow.toLocaleString("en-IN")}
*Payment Mode:* ${paymentMode}
*Transaction / RR No:* ${transactionId}
*Amount in Words:* ${amountInWords}
*Remaining Balance:* ${remainingBalance === 0 ? "Nil (Fully Paid)" : `₹${remainingBalance.toLocaleString("en-IN")}`}
*----------------------------------------*

*Address:* ${brand.address}
*Contact:* ${brand.phone} | ${brand.email}
*Website:* ${brand.website}

_Note: This is a computer generated receipt which doesn't require signature. Fees once paid will not be refundable._`;

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

        {/* Printable Receipt Paper */}
        <div className="printable-receipt-card" ref={receiptRef}>
          {/* Outer Double Border Container */}
          <div className="receipt-inner-frame">
            {/* Header Section */}
            <div className="receipt-header-row">
              {/* Left Column: Brand Logo & Contacts */}
              <div className="receipt-header-left">
                {brand.key === "dizitaladda" ? (
                  <div className="receipt-brand-logo-wrap">
                    <img
                      src={dizitalAddaLogo}
                      alt="Dizital Adda"
                      className="receipt-logo-img"
                    />
                  </div>
                ) : brand.key === "nidads" ? (
                  <div className="receipt-brand-text-logo">
                    <span className="nidads-title">NIDADS</span>
                    <span className="nidads-sub">National Institute of Digital Art & Design Skills</span>
                  </div>
                ) : (
                  /* NIGAPE Default / Uploaded Template exact match */
                  <div className="receipt-nigape-logo-wrap">
                    <div className="nigape-ai-icon-group">
                      <div className="nigape-circle-node">
                        <span className="nigape-ai-badge">AI</span>
                      </div>
                      <div className="nigape-inst-text">
                        <span>National Institute of GEN AI &</span>
                        <span>Prompt Engineering</span>
                      </div>
                    </div>
                    <div className="nigape-bold-text">nigape</div>
                  </div>
                )}

                <div className="receipt-contact-info">
                  <div>Ph : {brand.phone}</div>
                  <div>Email Id : {brand.email}</div>
                </div>
              </div>

              {/* Middle Column: Title & Website */}
              <div className="receipt-header-center">
                <h1 className="receipt-main-title">FEE RECEIPT</h1>
                <div className="receipt-website-link">{brand.website}</div>
              </div>

              {/* Right Column: Address Box */}
              <div className="receipt-header-right">
                <div className="receipt-address-box">
                  <div className="address-box-heading">Address:</div>
                  <div className="address-box-text">
                    2nd Floor, Spacetime Management Pvt Ltd Design House, Inder
                    Mohan Bhardwaj Marg, opposite Savitri Cinema Complex, Block
                    E, New, Greater Kailash, New Delhi, Delhi 110048.
                  </div>
                </div>
              </div>
            </div>

            {/* Separator Divider */}
            <div className="receipt-thick-divider"></div>

            {/* Student Info Grid */}
            <div className="receipt-student-grid">
              <div className="receipt-info-row">
                <div className="info-label">Rec No.</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">{receiptNo}</div>
              </div>

              <div className="receipt-info-row">
                <div className="info-label">Date</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">{paymentDate}</div>
              </div>

              <div className="receipt-info-row">
                <div className="info-label">Student Name</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">{studentName}</div>
              </div>

              <div className="receipt-info-row">
                <div className="info-label">Father's/Husband Name</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">{fatherName}</div>
              </div>

              <div className="receipt-info-row">
                <div className="info-label">Course Applied</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">{courseName}</div>
              </div>

              <div className="receipt-info-row">
                <div className="info-label">Fee Month(s)</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">{feeMonth}</div>
              </div>

              <div className="receipt-info-row">
                <div className="info-label">Course Fee</div>
                <div className="info-colon">:</div>
                <div className="info-val receipt-bold">
                  Rs. {totalCourseFee.toLocaleString("en-IN")}/-
                </div>
              </div>
            </div>

            {/* Particulars Table */}
            <table className="receipt-particulars-table">
              <thead>
                <tr>
                  <th className="th-desc">Description</th>
                  <th className="th-mode">Payment Mode</th>
                  <th className="th-amount">Amount Paid</th>
                  <th className="th-online">Online Payment Details: (RR NO.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="td-desc">{courseName}</td>
                  <td className="td-mode">{paymentMode}</td>
                  <td className="td-amount receipt-bold">
                    Rs. {amountPaidNow.toLocaleString("en-IN")}/-
                  </td>
                  <td className="td-online receipt-bold">
                    {transactionId || "UPI"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Calculations & Signatory Row */}
            <div className="receipt-bottom-split">
              {/* Left Column: Totals & Words */}
              <div className="receipt-totals-left">
                <div className="total-calc-line">
                  <span className="total-label">Total Amount</span>
                  <span className="total-colon">:</span>
                  <strong className="total-val">
                    Rs. {amountPaidNow.toLocaleString("en-IN")}/-
                  </strong>
                </div>

                <div className="total-calc-line">
                  <span className="total-label">Amount in Words</span>
                  <span className="total-colon">:</span>
                  <span className="total-words-val receipt-bold">
                    {amountInWords}
                  </span>
                </div>

                <div className="total-calc-line">
                  <span className="total-label">Balance</span>
                  <span className="total-colon">:</span>
                  <span className="total-val receipt-bold">
                    {remainingBalance === 0
                      ? "Nil"
                      : `Rs. ${remainingBalance.toLocaleString("en-IN")}/-`}
                  </span>
                </div>
              </div>

              {/* Right Column: Authorized Signatory Box */}
              <div className="receipt-signatory-right">
                <div className="signatory-box">
                  <div className="sign-signature-svg">
                    {/* Artistic digital signature curve matching template */}
                    <svg
                      viewBox="0 0 200 60"
                      className="sig-svg"
                      fill="none"
                      stroke="#1e3a8a"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M 20 42 Q 40 10 55 35 T 85 28 T 115 25 T 145 22 T 160 38" />
                      <path d="M 50 25 Q 90 5 125 18 T 175 32" />
                      <ellipse cx="160" cy="28" rx="20" ry="16" strokeWidth="1.8" />
                      <line x1="80" y1="46" x2="175" y2="44" stroke="#1e3a8a" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="signatory-title">(Authorized Signatory)</div>
                </div>
              </div>
            </div>

            {/* Divider above Notes */}
            <div className="receipt-medium-divider"></div>

            {/* Note & Footer */}
            <div className="receipt-notes-footer">
              <div className="receipt-note-line">
                <strong>Note:</strong> -This is computer generated receipt which doesn't require signature.
              </div>
              <div className="receipt-note-line indent">
                -Fees once paid will not be refundable.
              </div>
              <div className="receipt-bottom-bar-line"></div>
            </div>
          </div>
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
