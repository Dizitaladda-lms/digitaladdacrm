import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  FileUp,
  IdCard,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  deleteMyEmployeeDocument,
  getMyEmployeeDocumentAccessUrl,
  getMyEmployeeDocuments,
  uploadMyEmployeeDocument,
} from "../../services/employeeDocumentService";
import dizitalAddaLogo from "../../assets/logo/dizitaladda-logo.png";
import "./MyDocuments.css";

// Document Types strictly ordered with Bank Details as the LAST option
const DOC_TYPES = [
  {
    value: "AADHAAR_CARD",
    label: "Aadhaar Card",
    hint: "Government Aadhaar card (front & back image or combined PDF).",
    numberLabel: "Aadhaar Number",
    numberPlaceholder: "1234 5678 9012 (12 digits)",
    detailsLabel: "Aadhaar Details",
    detailsPlaceholder: "Full Name as printed on Aadhaar, Date of Birth & Registered Address",
  },
  {
    value: "PAN_CARD",
    label: "PAN Card",
    hint: "Permanent Account Number (PAN) card image or PDF.",
    numberLabel: "PAN Card Number",
    numberPlaceholder: "ABCDE1234F (10 characters)",
    detailsLabel: "PAN Details",
    detailsPlaceholder: "Full Name as printed on PAN Card, Father's Name & Date of Birth",
  },
  {
    value: "PROFILE_PHOTO",
    label: "ID Card Photo",
    hint: "Clear professional face photo. This appears on your official Employee ID card.",
    numberLabel: "",
    numberPlaceholder: "",
    detailsLabel: "",
    detailsPlaceholder: "",
  },
  {
    value: "OFFICE_DOCUMENT",
    label: "Office Document",
    hint: "Offer letter, appointment letter, contract, or joining document.",
    numberLabel: "Document / Reference Number",
    numberPlaceholder: "Reference or Serial Number (e.g. DA/2026/EMP-12)",
    detailsLabel: "Office Document Details",
    detailsPlaceholder: "Document Name, Issuing Manager/HR, Designation & Effective Joining Date",
  },
  {
    value: "OTHER",
    label: "Other Document",
    hint: "Educational certificate, address proof, or other company document.",
    numberLabel: "Document / Serial Number",
    numberPlaceholder: "Certificate or Registration Number",
    detailsLabel: "Document Details",
    detailsPlaceholder: "Document description, issuing authority/institute & issue date",
  },
  {
    value: "BANK_DETAILS",
    label: "Bank Details (Passbook / Cheque)",
    hint: "Bank passbook front page or cancelled cheque for salary processing.",
    numberLabel: "Bank Account Number",
    numberPlaceholder: "Enter Bank Account Number (9 to 18 digits)",
    detailsLabel: "Bank Details",
    detailsPlaceholder: "Bank Name, IFSC Code, Account Holder Name & Branch",
  },
];

const ESSENTIAL_TYPES = [
  { value: "AADHAAR_CARD", label: "Aadhaar Card" },
  { value: "PAN_CARD", label: "PAN Card" },
  { value: "PROFILE_PHOTO", label: "ID Photo" },
  { value: "OFFICE_DOCUMENT", label: "Office Doc" },
  { value: "BANK_DETAILS", label: "Bank Details" },
];

const formatFileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.ceil(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const MyDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("AADHAAR_CARD");
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentDetails, setDocumentDetails] = useState("");

  // Dedicated Bank Details Form State (Compulsory when BANK_DETAILS is selected)
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankConfirmAccountNumber, setBankConfirmAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankBranch, setBankBranch] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const selectedType =
    DOC_TYPES.find((type) => type.value === documentType) || DOC_TYPES[0];

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await getMyEmployeeDocuments();
      setDocuments(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load your documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const uploadedTypes = useMemo(
    () => new Set(documents.map((d) => d.document_type)),
    [documents]
  );

  const completedCount = useMemo(
    () => ESSENTIAL_TYPES.filter((t) => uploadedTypes.has(t.value)).length,
    [uploadedTypes]
  );

  const profilePhoto = useMemo(
    () => documents.find((document) => document.document_type === "PROFILE_PHOTO") || null,
    [documents]
  );

  useEffect(() => {
    let active = true;
    if (!profilePhoto) {
      setProfilePhotoUrl("");
      return undefined;
    }
    getMyEmployeeDocumentAccessUrl(profilePhoto.id)
      .then((response) => {
        if (active) setProfilePhotoUrl(response?.data?.access_url || "");
      })
      .catch(() => {
        if (active) setProfilePhotoUrl("");
      });
    return () => {
      active = false;
    };
  }, [profilePhoto?.id]);

  const handleTypeChange = (typeVal) => {
    setDocumentType(typeVal);
    setFile(null);
    setDocumentNumber("");
    setDocumentDetails("");
    if (typeVal === "AADHAAR_CARD") setDocumentLabel("Aadhaar Card");
    else if (typeVal === "PAN_CARD") setDocumentLabel("PAN Card");
    else if (typeVal === "PROFILE_PHOTO") setDocumentLabel("Official ID Card Photo");
    else if (typeVal === "OFFICE_DOCUMENT") setDocumentLabel("Offer Letter / Appointment Document");
    else if (typeVal === "BANK_DETAILS") setDocumentLabel("Salary Account Passbook / Cheque");
    else setDocumentLabel("");
  };

  const uploadDocument = async (event) => {
    event.preventDefault();

    // 1. File is compulsory for all document types
    if (!file) {
      toast.error("Document proof file select karna compulsory hai.");
      return;
    }

    // 2. Strict validation for BANK_DETAILS (Last Option)
    if (documentType === "BANK_DETAILS") {
      const cleanBankName = bankName.trim();
      const cleanAcc = bankAccountNumber.trim();
      const cleanConfirmAcc = bankConfirmAccountNumber.trim();
      const cleanIfsc = bankIfsc.trim().toUpperCase();
      const cleanHolder = bankAccountHolder.trim();
      const cleanBranch = bankBranch.trim();

      if (!cleanBankName) {
        toast.error("Bank Name bharna compulsory hai.");
        return;
      }
      if (!cleanAcc) {
        toast.error("Bank Account Number bharna compulsory hai.");
        return;
      }
      const rawAcc = cleanAcc.replace(/[\s-]/g, "");
      if (!/^\d{9,18}$/.test(rawAcc)) {
        toast.error("Bank Account Number 9 se 18 digits ka hona compulsory hai.");
        return;
      }
      if (cleanAcc !== cleanConfirmAcc) {
        toast.error("Account Number aur Confirm Account Number match nahi ho rahe.");
        return;
      }
      if (!cleanIfsc) {
        toast.error("Bank IFSC Code bharna compulsory hai.");
        return;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        toast.error("Valid 11-character IFSC Code (jaise SBIN0001234 / HDFC0001234) dalein.");
        return;
      }
      if (!cleanHolder) {
        toast.error("Account Holder Name bharna compulsory hai.");
        return;
      }
      if (!cleanBranch) {
        toast.error("Bank Branch / City bharna compulsory hai.");
        return;
      }

      const label = documentLabel.trim() || `Bank Details - ${cleanBankName}`;
      const details = `Bank: ${cleanBankName} | IFSC: ${cleanIfsc} | Holder: ${cleanHolder} | Branch: ${cleanBranch}`;

      try {
        setUploading(true);
        await uploadMyEmployeeDocument({
          file,
          documentType: "BANK_DETAILS",
          documentLabel: label,
          documentNumber: rawAcc,
          documentDetails: details,
        });
        toast.success("Bank details aur proof successfully save ho gaye!");
        setFile(null);
        setBankName("");
        setBankAccountNumber("");
        setBankConfirmAccountNumber("");
        setBankIfsc("");
        setBankAccountHolder("");
        setBankBranch("");
        setDocumentLabel("");
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Bank details upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 3. Strict validation for PROFILE_PHOTO (ID Photo)
    if (documentType === "PROFILE_PHOTO") {
      const label = documentLabel.trim() || "Official ID Card Photo";
      try {
        setUploading(true);
        await uploadMyEmployeeDocument({
          file,
          documentType: "PROFILE_PHOTO",
          documentLabel: label,
          documentNumber: "",
          documentDetails: "",
        });
        toast.success("ID Card photo successfully upload ho gayi!");
        setFile(null);
        setDocumentLabel("");
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "ID Photo upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 4. Strict validation for Aadhaar, PAN, Office Document, and Other
    const cleanLabel = documentLabel.trim();
    const cleanNumber = documentNumber.trim();
    const cleanDetails = documentDetails.trim();

    if (!cleanLabel) {
      toast.error("Document Label bharna compulsory hai.");
      return;
    }
    if (!cleanNumber) {
      toast.error(`${selectedType.numberLabel || "Document Number"} bharna compulsory hai.`);
      return;
    }

    if (documentType === "AADHAAR_CARD") {
      const aadhaarDigits = cleanNumber.replace(/[\s-]/g, "");
      if (!/^\d{12}$/.test(aadhaarDigits)) {
        toast.error("Aadhaar Number exactly 12 digits ka hona compulsory hai.");
        return;
      }
    }

    if (documentType === "PAN_CARD") {
      const panUpper = cleanNumber.toUpperCase();
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(panUpper)) {
        toast.error("Valid 10-character PAN number (jaise ABCDE1234F) bharna compulsory hai.");
        return;
      }
    }

    if (!cleanDetails) {
      toast.error(`${selectedType.detailsLabel || "Document Details"} bharna compulsory hai.`);
      return;
    }

    try {
      setUploading(true);
      await uploadMyEmployeeDocument({
        file,
        documentType,
        documentLabel: cleanLabel,
        documentNumber: cleanNumber,
        documentDetails: cleanDetails,
      });
      toast.success(`${selectedType.label} successfully upload ho gaya!`);
      setFile(null);
      setDocumentLabel("");
      setDocumentNumber("");
      setDocumentDetails("");
      await loadDocuments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Document upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (document) => {
    try {
      const response = await getMyEmployeeDocumentAccessUrl(document.id);
      window.open(response?.data?.access_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not open this document.");
    }
  };

  const removeDocument = async (document) => {
    if (!window.confirm(`Remove ${document.document_label}?`)) return;
    try {
      await deleteMyEmployeeDocument(document.id);
      toast.success("Document removed.");
      await loadDocuments();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not remove document.");
    }
  };

  return (
    <main className="employee-documents-page">
      <div className="employee-documents-heading">
        <div>
          <span className="employee-documents-kicker">
            <ShieldCheck size={15} /> PRIVATE EMPLOYEE VAULT
          </span>
          <h1>My Documents &amp; ID Card</h1>
          <p>
            Keep your identity, office records, and bank details safely in one place. All fields are compulsory for complete verification.
          </p>
        </div>
        <div className="employee-documents-security">
          <ShieldCheck size={18} />
          <span>Private &amp; Secure</span>
        </div>
      </div>

      {/* Document Completion Progress Banner */}
      <section className="document-completion-banner">
        <div className="document-completion-info">
          <div className="document-completion-title">
            <CheckCircle2 size={18} color="#2563eb" />
            <strong>
              Verification Progress ({completedCount} of {ESSENTIAL_TYPES.length} Completed)
            </strong>
          </div>
          <p>
            Har employee ke liye sabhi document sections bharna compulsory hai. <strong>Bank details aakhri step me hai</strong> taaki sab log saari details complete karein.
          </p>
        </div>
        <div className="document-completion-chips">
          {ESSENTIAL_TYPES.map((req) => {
            const isDone = uploadedTypes.has(req.value);
            return (
              <button
                key={req.value}
                type="button"
                onClick={() => handleTypeChange(req.value)}
                className={`doc-chip ${isDone ? "is-complete" : "is-pending"}`}
              >
                {isDone ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{req.label}</span>
                <small>{isDone ? "✓ Uploaded" : "⚠️ Pending"}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="employee-documents-layout">
        <div className="employee-documents-content">
          <form onSubmit={uploadDocument} className="document-upload-card">
            <div className="document-card-title">
              <span className="document-card-icon">
                <UploadCloud size={20} />
              </span>
              <div>
                <h2>Upload Employee Document &amp; Details</h2>
                <p>Select what you are uploading. All fields marked with * are compulsory.</p>
              </div>
            </div>

            {/* Document Type Selection Cards (Bank details is strictly LAST) */}
            <div className="document-type-cards" role="radiogroup" aria-label="Document type">
              {DOC_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={documentType === type.value}
                  onClick={() => handleTypeChange(type.value)}
                  className={`document-type-card${
                    documentType === type.value ? " is-selected" : ""
                  }`}
                >
                  <strong>{type.label}</strong>
                  <small>{type.hint}</small>
                </button>
              ))}
            </div>

            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 18 }}>
              PDF, JPG, PNG, WEBP · maximum 5 MB. Identity &amp; bank details are encrypted; HR sees verified information safely.
            </p>

            <div className="document-form-grid">
              {/* Document Category Dropdown */}
              <label className="document-field">
                What are you uploading? <span className="required-star">* (Compulsory)</span>
                <select
                  value={documentType}
                  onChange={(event) => handleTypeChange(event.target.value)}
                  required
                >
                  {DOC_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <span className="document-field-hint">
                  <CheckCircle2 size={14} /> {selectedType.hint}
                </span>
              </label>

              {/* Document Label (Compulsory) */}
              <label className="document-field">
                Document Label <span className="required-star">* (Compulsory)</span>
                <input
                  value={documentLabel}
                  onChange={(event) => setDocumentLabel(event.target.value)}
                  placeholder={`Example: ${selectedType.label}`}
                  required
                />
                <span className="document-field-hint">
                  {documentType === "BANK_DETAILS"
                    ? "e.g. Salary Bank Account (Passbook / Cheque)"
                    : "Official title or label for this record."}
                </span>
              </label>

              {/* SPECIAL STRUCTURED SECTION FOR BANK DETAILS (LAST OPTION) */}
              {documentType === "BANK_DETAILS" ? (
                <>
                  <div className="bank-notice">
                    <CreditCard size={18} />
                    <div>
                      <strong>Bank Details &amp; Proof of Account (Compulsory for Salary Processing)</strong>
                      <div>Passbook ke front page ki clear photo ya Cancelled Cheque upload karein.</div>
                    </div>
                  </div>

                  <label className="document-field">
                    Bank Name <span className="required-star">* (Compulsory)</span>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, HDFC Bank, ICICI"
                      required
                    />
                    <span className="document-field-hint">Apne bank ka official naam likhein.</span>
                  </label>

                  <label className="document-field">
                    Account Holder Name <span className="required-star">* (Compulsory)</span>
                    <input
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Name as printed in Bank Passbook / Cheque"
                      required
                    />
                    <span className="document-field-hint">Passbook par jo naam likha hai wahi dalein.</span>
                  </label>

                  <label className="document-field">
                    Bank Account Number <span className="required-star">* (Compulsory)</span>
                    <input
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      maxLength={18}
                      placeholder="Enter 9 to 18 digits account number"
                      required
                    />
                    <span className="document-field-hint">Sirf numbers dalein (9 se 18 digits).</span>
                  </label>

                  <label className="document-field">
                    Confirm Account Number <span className="required-star">* (Compulsory)</span>
                    <input
                      value={bankConfirmAccountNumber}
                      onChange={(e) => setBankConfirmAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      maxLength={18}
                      placeholder="Re-enter bank account number to confirm"
                      required
                    />
                    <span className="document-field-hint">Typo se bachne ke liye dobara account number dalein.</span>
                  </label>

                  <label className="document-field">
                    IFSC Code <span className="required-star">* (Compulsory)</span>
                    <input
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                      maxLength={11}
                      placeholder="e.g. SBIN0001234, HDFC0001234"
                      required
                    />
                    <span className="document-field-hint">11-character bank branch IFSC code.</span>
                  </label>

                  <label className="document-field">
                    Branch Name / City <span className="required-star">* (Compulsory)</span>
                    <input
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="e.g. Connaught Place Branch, Delhi"
                      required
                    />
                    <span className="document-field-hint">Bank branch ka location ya city.</span>
                  </label>
                </>
              ) : documentType !== "PROFILE_PHOTO" ? (
                <>
                  {/* Generic Document Number for Aadhaar, PAN, Office, Other */}
                  <label className="document-field">
                    {selectedType.numberLabel} <span className="required-star">* (Compulsory)</span>
                    <input
                      value={documentNumber}
                      onChange={(event) => setDocumentNumber(event.target.value)}
                      inputMode={documentType === "AADHAAR_CARD" ? "numeric" : "text"}
                      maxLength={documentType === "AADHAAR_CARD" ? 14 : 30}
                      placeholder={selectedType.numberPlaceholder}
                      required
                    />
                    <span className="document-field-hint">
                      {documentType === "AADHAAR_CARD"
                        ? "Exactly 12 digits required (encrypted in database)."
                        : documentType === "PAN_CARD"
                        ? "Valid 10-character PAN format (e.g. ABCDE1234F)."
                        : "Official document or serial reference number."}
                    </span>
                  </label>

                  {/* Document Details (Compulsory) */}
                  <label className="document-field document-field--full">
                    {selectedType.detailsLabel} <span className="required-star">* (Compulsory)</span>
                    <textarea
                      value={documentDetails}
                      onChange={(event) => setDocumentDetails(event.target.value)}
                      maxLength={1000}
                      placeholder={selectedType.detailsPlaceholder}
                      required
                    />
                    <span className="document-field-hint">
                      Har document ki complete details bharna compulsory hai.
                    </span>
                  </label>
                </>
              ) : null}

              {/* File Upload Section (Compulsory for All) */}
              <label className="document-file-section">
                Upload Proof File (Image or PDF) <span className="required-star">* (Compulsory)</span>
                <span>
                  {documentType === "PROFILE_PHOTO"
                    ? "Clear passport face photo (JPG, PNG, WEBP · up to 5 MB)"
                    : documentType === "BANK_DETAILS"
                    ? "Passbook front page or Cancelled Cheque (JPG, PNG, PDF · up to 5 MB)"
                    : "PDF, JPG, PNG or WEBP · up to 5 MB"}
                </span>
                <input
                  className="document-file-input"
                  type="file"
                  accept={
                    documentType === "PROFILE_PHOTO"
                      ? "image/jpeg,image/png,image/webp"
                      : "application/pdf,image/jpeg,image/png,image/webp"
                  }
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  required
                />
                {file && (
                  <span className="document-selected-file">
                    <FileText size={20} />
                    <strong>{file.name}</strong>
                    <small>
                      {formatFileSize(file.size)} · Ready as {selectedType.label}
                    </small>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="Remove selected file"
                    >
                      <X size={16} />
                    </button>
                  </span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="document-upload-submit"
            >
              {uploading ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Uploading &amp; Verifying…
                </>
              ) : (
                <>
                  <UploadCloud size={16} /> Submit &amp; Save {selectedType.label}
                </>
              )}
            </button>
          </form>

          {/* Uploaded Documents List */}
          <section className="uploaded-documents-card">
            <div className="document-card-title">
              <span className="document-card-icon document-card-icon-soft">
                <FileText size={20} />
              </span>
              <div>
                <h2>My Uploaded Documents</h2>
                <p>
                  {loading
                    ? "Checking your private vault..."
                    : `${documents.length} document${
                        documents.length === 1 ? "" : "s"
                      } saved securely`}
                </p>
              </div>
            </div>
            {loading ? (
              <p>Loading…</p>
            ) : documents.length === 0 ? (
              <p style={{ color: "#64748b" }}>
                Abhi tak koi document upload nahi hua hai. Kripya upar diye gaye form se har option complete karein.
              </p>
            ) : (
              documents.map((document) => (
                <div key={document.id} className="uploaded-document-row">
                  <div>
                    <strong>{document.document_label}</strong>
                    <div style={{ color: "#64748b", fontSize: 12 }}>
                      {document.document_type.replaceAll("_", " ")} · {document.original_filename}
                    </div>
                    {document.document_number && (
                      <small className="document-manual-detail">
                        {document.document_type === "BANK_DETAILS"
                          ? `Account No.: ${document.document_number}`
                          : `Document No.: ${document.document_number}`}
                      </small>
                    )}
                    {document.document_details && (
                      <small className="document-manual-detail">
                        {document.document_details}
                      </small>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => openDocument(document)}
                      title="Open securely"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDocument(document)}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Employee ID Card Preview & Print */}
        <aside className="employee-id-card">
          <div className="employee-id-company">
            <img src={dizitalAddaLogo} alt="Dizital Adda" />
          </div>
          <div className="employee-id-title">OFFICIAL EMPLOYEE ID</div>
          <div className="employee-id-photo">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Employee ID" />
            ) : (
              <>
                <ImagePlus size={28} />
                <span>Upload ID photo</span>
              </>
            )}
          </div>
          {!profilePhotoUrl && (
            <div className="employee-id-photo-note">
              Select <strong>ID Card Photo</strong> option to set your face image here.
            </div>
          )}
          <div className="employee-id-name">{user?.full_name || "Employee"}</div>
          <div className="employee-id-designation">
            {user?.designation || user?.role || "Team Member"}
          </div>
          <div className="employee-id-department">
            <span>DEPARTMENT</span>
            <strong>{user?.department_name || "Dizital Adda"}</strong>
          </div>
          <div className="employee-id-number">
            <span>EMPLOYEE ID</span>
            <strong>{user?.employee_code || `EMP-${user?.id || "-"}`}</strong>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="employee-id-print"
          >
            <IdCard size={16} /> Print ID Card
          </button>
        </aside>
      </section>
    </main>
  );
};

export default MyDocuments;
