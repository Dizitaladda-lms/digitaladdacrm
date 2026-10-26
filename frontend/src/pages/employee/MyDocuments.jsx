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
  },
  {
    value: "PAN_CARD",
    label: "PAN Card",
    hint: "Permanent Account Number (PAN) card image or PDF.",
  },
  {
    value: "PROFILE_PHOTO",
    label: "ID Card Photo",
    hint: "Clear professional face photo. This appears on your official Employee ID card.",
  },
  {
    value: "OFFICE_DOCUMENT",
    label: "Office Document",
    hint: "Offer letter, appointment letter, contract, or joining document.",
  },
  {
    value: "OTHER",
    label: "Other Document",
    hint: "Educational certificate, address proof, or other company document.",
  },
  {
    value: "BANK_DETAILS",
    label: "Bank Details (Passbook / Cheque)",
    hint: "Bank passbook front page or cancelled cheque for salary processing.",
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

  // 1. Dedicated Aadhaar Card Fields
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarName, setAadhaarName] = useState("");
  const [aadhaarDob, setAadhaarDob] = useState("");
  const [aadhaarGender, setAadhaarGender] = useState("Male");
  const [aadhaarAddress, setAadhaarAddress] = useState("");

  // 2. Dedicated PAN Card Fields
  const [panNumber, setPanNumber] = useState("");
  const [panName, setPanName] = useState("");
  const [panFatherName, setPanFatherName] = useState("");
  const [panDob, setPanDob] = useState("");

  // 3. Dedicated Bank Details Fields (Compulsory when BANK_DETAILS is selected)
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankConfirmAccountNumber, setBankConfirmAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankBranch, setBankBranch] = useState("");

  // 4. Dedicated Office Document Fields
  const [officeDocType, setOfficeDocType] = useState("Offer Letter");
  const [officeRefNumber, setOfficeRefNumber] = useState("");
  const [officeIssuer, setOfficeIssuer] = useState("");
  const [officeDate, setOfficeDate] = useState("");

  // 5. Dedicated Other Document Fields
  const [otherCategory, setOtherCategory] = useState("10th Class Marksheet / Certificate");
  const [otherDocNumber, setOtherDocNumber] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherIssuer, setOtherIssuer] = useState("");
  const [otherDate, setOtherDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const selectedType =
    DOC_TYPES.find((type) => type.value === documentType) || DOC_TYPES[0];

  // Automatic Document Label (User doesn't have to manually type document label)
  const computedDocumentLabel = useMemo(() => {
    switch (documentType) {
      case "AADHAAR_CARD":
        return "Aadhaar Card";
      case "PAN_CARD":
        return "PAN Card";
      case "PROFILE_PHOTO":
        return "Official ID Card Photo";
      case "BANK_DETAILS":
        return bankName.trim() ? `Bank Details - ${bankName.trim()}` : "Bank Details (Passbook / Cheque)";
      case "OFFICE_DOCUMENT":
        return officeDocType || "Office Document";
      case "OTHER":
        return otherCategory || "Other Document";
      default:
        return selectedType.label;
    }
  }, [documentType, bankName, officeDocType, otherCategory, selectedType]);

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
  };

  const uploadDocument = async (event) => {
    event.preventDefault();

    // 1. File is compulsory for all document types
    if (!file) {
      toast.error("Document proof file select karna compulsory hai.");
      return;
    }

    const label = computedDocumentLabel;

    // 2. BANK_DETAILS (Passbook / Cancelled Cheque)
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
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Bank details upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 3. PROFILE_PHOTO (Official ID Card Photo)
    if (documentType === "PROFILE_PHOTO") {
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
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "ID Photo upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 4. AADHAAR_CARD (Aadhaar Card)
    if (documentType === "AADHAAR_CARD") {
      const cleanNum = aadhaarNumber.replace(/[\s-]/g, "");
      const cleanName = aadhaarName.trim();
      const cleanDob = aadhaarDob.trim();
      const cleanGender = aadhaarGender.trim();
      const cleanAddress = aadhaarAddress.trim();

      if (!/^\d{12}$/.test(cleanNum)) {
        toast.error("Aadhaar Number exactly 12 digits ka hona compulsory hai.");
        return;
      }
      if (!cleanName) {
        toast.error("Aadhaar par printed Full Name bharna compulsory hai.");
        return;
      }
      if (!cleanDob) {
        toast.error("Aadhaar Date of Birth (DOB) select karna compulsory hai.");
        return;
      }
      if (!cleanGender) {
        toast.error("Aadhaar Gender select karna compulsory hai.");
        return;
      }
      if (!cleanAddress) {
        toast.error("Aadhaar Registered Address bharna compulsory hai.");
        return;
      }

      const details = `Name: ${cleanName} | DOB: ${cleanDob} | Gender: ${cleanGender} | Address: ${cleanAddress}`;

      try {
        setUploading(true);
        await uploadMyEmployeeDocument({
          file,
          documentType: "AADHAAR_CARD",
          documentLabel: label,
          documentNumber: cleanNum,
          documentDetails: details,
        });
        toast.success("Aadhaar Card successfully upload ho gaya!");
        setFile(null);
        setAadhaarNumber("");
        setAadhaarName("");
        setAadhaarDob("");
        setAadhaarAddress("");
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Aadhaar upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 5. PAN_CARD (PAN Card)
    if (documentType === "PAN_CARD") {
      const cleanPan = panNumber.trim().toUpperCase();
      const cleanName = panName.trim();
      const cleanFather = panFatherName.trim();
      const cleanDob = panDob.trim();

      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) {
        toast.error("Valid 10-character PAN number (jaise ABCDE1234F) bharna compulsory hai.");
        return;
      }
      if (!cleanName) {
        toast.error("PAN Card par printed Full Name bharna compulsory hai.");
        return;
      }
      if (!cleanFather) {
        toast.error("Father's Name bharna compulsory hai.");
        return;
      }
      if (!cleanDob) {
        toast.error("PAN Card Date of Birth (DOB) select karna compulsory hai.");
        return;
      }

      const details = `Name: ${cleanName} | Father's Name: ${cleanFather} | DOB: ${cleanDob}`;

      try {
        setUploading(true);
        await uploadMyEmployeeDocument({
          file,
          documentType: "PAN_CARD",
          documentLabel: label,
          documentNumber: cleanPan,
          documentDetails: details,
        });
        toast.success("PAN Card successfully upload ho gaya!");
        setFile(null);
        setPanNumber("");
        setPanName("");
        setPanFatherName("");
        setPanDob("");
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "PAN Card upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 6. OFFICE_DOCUMENT (Offer letter, Appointment letter, etc.)
    if (documentType === "OFFICE_DOCUMENT") {
      const cleanType = officeDocType.trim();
      const cleanRef = officeRefNumber.trim();
      const cleanIssuer = officeIssuer.trim();
      const cleanDate = officeDate.trim();

      if (!cleanRef) {
        toast.error("Document / Reference Number bharna compulsory hai.");
        return;
      }
      if (!cleanIssuer) {
        toast.error("Issuing Authority / HR Name bharna compulsory hai.");
        return;
      }
      if (!cleanDate) {
        toast.error("Issue / Effective Date select karna compulsory hai.");
        return;
      }

      const details = `Type: ${cleanType} | Issuer: ${cleanIssuer} | Effective Date: ${cleanDate}`;

      try {
        setUploading(true);
        await uploadMyEmployeeDocument({
          file,
          documentType: "OFFICE_DOCUMENT",
          documentLabel: label,
          documentNumber: cleanRef,
          documentDetails: details,
        });
        toast.success("Office Document successfully upload ho gaya!");
        setFile(null);
        setOfficeRefNumber("");
        setOfficeIssuer("");
        setOfficeDate("");
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Office Document upload failed.");
      } finally {
        setUploading(false);
      }
      return;
    }

    // 7. OTHER (Degrees, Marksheets, Certificates, IDs)
    if (documentType === "OTHER") {
      const cleanCat = otherCategory.trim();
      const cleanDocNo = otherDocNumber.trim();
      const cleanName = otherName.trim();
      const cleanIssuer = otherIssuer.trim();
      const cleanDate = otherDate.trim();

      if (!cleanDocNo) {
        toast.error("Document / Roll / Certificate Number bharna compulsory hai.");
        return;
      }
      if (!cleanName) {
        toast.error("Name as on Document bharna compulsory hai.");
        return;
      }
      if (!cleanIssuer) {
        toast.error("Issuing Authority / Board bharna compulsory hai.");
        return;
      }
      if (!cleanDate) {
        toast.error("Passing Year / Issue Date bharna compulsory hai.");
        return;
      }

      const details = `Category: ${cleanCat} | Name: ${cleanName} | Authority: ${cleanIssuer} | Year/Date: ${cleanDate}`;

      try {
        setUploading(true);
        await uploadMyEmployeeDocument({
          file,
          documentType: "OTHER",
          documentLabel: label,
          documentNumber: cleanDocNo,
          documentDetails: details,
        });
        toast.success(`${cleanCat} successfully upload ho gaya!`);
        setFile(null);
        setOtherDocNumber("");
        setOtherName("");
        setOtherIssuer("");
        setOtherDate("");
        await loadDocuments();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Document upload failed.");
      } finally {
        setUploading(false);
      }
      return;
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

              {/* Document Label (Automatic) */}
              <label className="document-field">
                Document Label <span style={{ color: "#16a34a", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>(Automatic)</span>
                <input
                  value={computedDocumentLabel}
                  readOnly
                  tabIndex={-1}
                  style={{
                    background: "#f8fafc",
                    color: "#1e293b",
                    fontWeight: 650,
                    cursor: "default",
                    borderColor: "#cbd5e1",
                  }}
                />
                <span className="document-field-hint">
                  <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
                  Official title automatically assigned for HR records.
                </span>
              </label>

              {/* SPECIAL STRUCTURED SECTION FOR AADHAAR CARD */}
              {documentType === "AADHAAR_CARD" && (
                <>
                  <div className="bank-notice" style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
                    <IdCard size={18} />
                    <div>
                      <strong>Aadhaar Card Verification Details (Compulsory)</strong>
                      <div>Aadhaar card par printed sabhi details alag-alag columns me bharein.</div>
                    </div>
                  </div>

                  <label className="document-field">
                    Aadhaar Number <span className="required-star">* (Compulsory)</span>
                    <input
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="Enter 12 digits Aadhaar number"
                      required
                    />
                    <span className="document-field-hint">
                      Exactly 12 digits required (database me encrypted rahega).
                    </span>
                  </label>

                  <label className="document-field">
                    Full Name as on Aadhaar <span className="required-star">* (Compulsory)</span>
                    <input
                      value={aadhaarName}
                      onChange={(e) => setAadhaarName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      required
                    />
                    <span className="document-field-hint">
                      Aadhaar card par printed official naam dalein.
                    </span>
                  </label>

                  <label className="document-field">
                    Date of Birth (DOB) as on Aadhaar <span className="required-star">* (Compulsory)</span>
                    <input
                      type="date"
                      value={aadhaarDob}
                      onChange={(e) => setAadhaarDob(e.target.value)}
                      required
                    />
                    <span className="document-field-hint">
                      Aadhaar card par printed birth date select karein.
                    </span>
                  </label>

                  <label className="document-field">
                    Gender as on Aadhaar <span className="required-star">* (Compulsory)</span>
                    <select
                      value={aadhaarGender}
                      onChange={(e) => setAadhaarGender(e.target.value)}
                      required
                    >
                      <option value="Male">Male (पुरुष)</option>
                      <option value="Female">Female (महिला)</option>
                      <option value="Other">Other</option>
                    </select>
                    <span className="document-field-hint">
                      Aadhaar card ke according gender select karein.
                    </span>
                  </label>

                  <label className="document-field document-field--full">
                    Registered Address as on Aadhaar <span className="required-star">* (Compulsory)</span>
                    <input
                      value={aadhaarAddress}
                      onChange={(e) => setAadhaarAddress(e.target.value)}
                      placeholder="House/Flat No., Street, Landmark, Area, City, State, PIN Code"
                      required
                    />
                    <span className="document-field-hint">
                      Aadhaar card ke backside par likha hua complete registered address dalein.
                    </span>
                  </label>
                </>
              )}

              {/* SPECIAL STRUCTURED SECTION FOR PAN CARD */}
              {documentType === "PAN_CARD" && (
                <>
                  <div className="bank-notice" style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
                    <IdCard size={18} />
                    <div>
                      <strong>PAN Card Verification Details (Compulsory)</strong>
                      <div>PAN card par printed sabhi details alag-alag columns me bharein.</div>
                    </div>
                  </div>

                  <label className="document-field">
                    PAN Card Number <span className="required-star">* (Compulsory)</span>
                    <input
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F (10 characters)"
                      required
                    />
                    <span className="document-field-hint">
                      Valid 10-character alphanumeric PAN format.
                    </span>
                  </label>

                  <label className="document-field">
                    Full Name as on PAN Card <span className="required-star">* (Compulsory)</span>
                    <input
                      value={panName}
                      onChange={(e) => setPanName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar (Name on PAN)"
                      required
                    />
                    <span className="document-field-hint">
                      PAN card par printed pura naam dalein.
                    </span>
                  </label>

                  <label className="document-field">
                    Father's Name as on PAN <span className="required-star">* (Compulsory)</span>
                    <input
                      value={panFatherName}
                      onChange={(e) => setPanFatherName(e.target.value)}
                      placeholder="Father's full name"
                      required
                    />
                    <span className="document-field-hint">
                      PAN card par printed father ka naam dalein.
                    </span>
                  </label>

                  <label className="document-field">
                    Date of Birth (DOB) as on PAN <span className="required-star">* (Compulsory)</span>
                    <input
                      type="date"
                      value={panDob}
                      onChange={(e) => setPanDob(e.target.value)}
                      required
                    />
                    <span className="document-field-hint">
                      PAN card par printed birth date select karein.
                    </span>
                  </label>
                </>
              )}

              {/* SPECIAL STRUCTURED SECTION FOR OFFICE DOCUMENT */}
              {documentType === "OFFICE_DOCUMENT" && (
                <>
                  <div className="bank-notice">
                    <Building size={18} />
                    <div>
                      <strong>Office Document Details (Compulsory)</strong>
                      <div>Offer letter, appointment, contract ya company document details dalein.</div>
                    </div>
                  </div>

                  <label className="document-field">
                    Office Document Type <span className="required-star">* (Compulsory)</span>
                    <select
                      value={officeDocType}
                      onChange={(e) => setOfficeDocType(e.target.value)}
                      required
                    >
                      <option value="Offer Letter">Offer Letter</option>
                      <option value="Appointment Letter">Appointment Letter</option>
                      <option value="Joining Agreement / Contract">Joining Agreement / Contract</option>
                      <option value="Relieving / Experience Letter">Relieving / Experience Letter</option>
                      <option value="Salary Slip / Appraisal Letter">Salary Slip / Appraisal Letter</option>
                      <option value="NDA (Non-Disclosure Agreement)">NDA (Non-Disclosure Agreement)</option>
                      <option value="Other Office Document">Other Office Document</option>
                    </select>
                    <span className="document-field-hint">Document type select karein.</span>
                  </label>

                  <label className="document-field">
                    Document / Reference Number <span className="required-star">* (Compulsory)</span>
                    <input
                      value={officeRefNumber}
                      onChange={(e) => setOfficeRefNumber(e.target.value)}
                      placeholder="e.g. DA/2026/OFF-012 or Serial No."
                      required
                    />
                    <span className="document-field-hint">Document reference ya serial number.</span>
                  </label>

                  <label className="document-field">
                    Issuing Company / Authority / HR <span className="required-star">* (Compulsory)</span>
                    <input
                      value={officeIssuer}
                      onChange={(e) => setOfficeIssuer(e.target.value)}
                      placeholder="e.g. Dizital Adda / HR Department"
                      required
                    />
                    <span className="document-field-hint">Document issue karne wali company ya HR ka naam.</span>
                  </label>

                  <label className="document-field">
                    Issue / Effective Date <span className="required-star">* (Compulsory)</span>
                    <input
                      type="date"
                      value={officeDate}
                      onChange={(e) => setOfficeDate(e.target.value)}
                      required
                    />
                    <span className="document-field-hint">Document issue ya effective joining date.</span>
                  </label>
                </>
              )}

              {/* SPECIAL STRUCTURED SECTION FOR OTHER DOCUMENT */}
              {documentType === "OTHER" && (
                <>
                  <div className="bank-notice">
                    <FileText size={18} />
                    <div>
                      <strong>Educational &amp; Other Document Details (Compulsory)</strong>
                      <div>Degrees, marksheet ya other ID proof ke sabhi columns bharein.</div>
                    </div>
                  </div>

                  <label className="document-field">
                    Document Category <span className="required-star">* (Compulsory)</span>
                    <select
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      required
                    >
                      <option value="10th Class Marksheet / Certificate">10th Class Marksheet / Certificate</option>
                      <option value="12th Class Marksheet / Certificate">12th Class Marksheet / Certificate</option>
                      <option value="Graduation Degree / Marksheet">Graduation Degree / Marksheet</option>
                      <option value="Post Graduation / Master's Degree">Post Graduation / Master's Degree</option>
                      <option value="Diploma / Professional Certificate">Diploma / Professional Certificate</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                      <option value="Voter ID Card">Voter ID Card</option>
                      <option value="Electricity / Utility Bill (Address Proof)">Electricity / Utility Bill (Address Proof)</option>
                      <option value="Other Document">Other Document</option>
                    </select>
                    <span className="document-field-hint">Document category select karein.</span>
                  </label>

                  <label className="document-field">
                    Document / Roll / Certificate Number <span className="required-star">* (Compulsory)</span>
                    <input
                      value={otherDocNumber}
                      onChange={(e) => setOtherDocNumber(e.target.value)}
                      placeholder="e.g. Roll No / License No / Serial No"
                      required
                    />
                    <span className="document-field-hint">Official serial, roll ya license number.</span>
                  </label>

                  <label className="document-field">
                    Name as printed on Document <span className="required-star">* (Compulsory)</span>
                    <input
                      value={otherName}
                      onChange={(e) => setOtherName(e.target.value)}
                      placeholder="Full name as printed on this document"
                      required
                    />
                    <span className="document-field-hint">Document par printed candidate / holder ka naam.</span>
                  </label>

                  <label className="document-field">
                    Issuing Board / University / Authority <span className="required-star">* (Compulsory)</span>
                    <input
                      value={otherIssuer}
                      onChange={(e) => setOtherIssuer(e.target.value)}
                      placeholder="e.g. CBSE / Delhi University / RTO / Govt of India"
                      required
                    />
                    <span className="document-field-hint">Authority ya board ka naam.</span>
                  </label>

                  <label className="document-field document-field--full">
                    Passing Year / Issue Date <span className="required-star">* (Compulsory)</span>
                    <input
                      value={otherDate}
                      onChange={(e) => setOtherDate(e.target.value)}
                      placeholder="e.g. 2022 or 15-08-2022"
                      required
                    />
                    <span className="document-field-hint">Passing year ya document issue date dalein.</span>
                  </label>
                </>
              )}

              {/* SPECIAL NOTICE FOR PROFILE PHOTO */}
              {documentType === "PROFILE_PHOTO" && (
                <div className="bank-notice" style={{ background: "#f8fafc", borderColor: "#cbd5e1", color: "#334155" }}>
                  <ImagePlus size={18} />
                  <div>
                    <strong>Official Employee ID Card Photo</strong>
                    <div>Apni clear passport-size photo select karein. Ye photo aapke official company ID card par print hogi.</div>
                  </div>
                </div>
              )}

              {/* SPECIAL STRUCTURED SECTION FOR BANK DETAILS (LAST OPTION) */}
              {documentType === "BANK_DETAILS" && (
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
              )}

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
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                        {document.document_details.split(" | ").map((part, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#f1f5f9",
                              color: "#334155",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 500,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {part}
                          </span>
                        ))}
                      </div>
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
