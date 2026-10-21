import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, FileUp, IdCard, ImagePlus, LoaderCircle, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  deleteMyEmployeeDocument,
  getMyEmployeeDocumentAccessUrl,
  getMyEmployeeDocuments,
  uploadMyEmployeeDocument,
} from "../../services/employeeDocumentService";
import "./MyDocuments.css";

const DOC_TYPES = [
  { value: "AADHAAR_CARD", label: "Aadhaar Card", hint: "Upload Aadhaar front or a combined PDF." },
  { value: "PAN_CARD", label: "PAN Card", hint: "Upload your PAN card image or PDF." },
  { value: "OFFICE_DOCUMENT", label: "Office Document", hint: "Offer letter, joining document, or other office file." },
  { value: "OTHER", label: "Other Document", hint: "Any other document requested by the office." },
  { value: "PROFILE_PHOTO", label: "ID Card Photo", hint: "A clear face photo. This appears on your employee ID card." },
];

const formatFileSize = (bytes) => bytes < 1024 * 1024
  ? `${Math.ceil(bytes / 1024)} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const MyDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("AADHAAR_CARD");
  const [documentLabel, setDocumentLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const selectedType = DOC_TYPES.find((type) => type.value === documentType) || DOC_TYPES[0];

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

  useEffect(() => { loadDocuments(); }, []);

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
    return () => { active = false; };
  }, [profilePhoto?.id]);

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (!file) return toast.error("Select a PDF or image first.");
    try {
      setUploading(true);
      await uploadMyEmployeeDocument({ file, documentType, documentLabel });
      setFile(null);
      setDocumentLabel("");
      event.currentTarget.reset();
      toast.success("Document uploaded securely.");
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
          <span className="employee-documents-kicker"><ShieldCheck size={15} /> PRIVATE EMPLOYEE VAULT</span>
          <h1>My Documents & ID Card</h1>
          <p>Keep your identity and office documents safely in one place. Only you can open these files.</p>
        </div>
        <div className="employee-documents-security"><ShieldCheck size={18} /><span>Private & secure</span></div>
      </div>

      <section className="employee-documents-layout">
        <div className="employee-documents-content">
          <form onSubmit={uploadDocument} className="document-upload-card">
            <div className="document-card-title"><span className="document-card-icon"><UploadCloud size={20} /></span><div><h2>Upload a document</h2><p>Select what you are uploading, then choose the file.</p></div></div>
            <div className="document-type-cards" role="radiogroup" aria-label="Document type">
              {DOC_TYPES.map((type) => (
                <button key={type.value} type="button" role="radio" aria-checked={documentType === type.value} onClick={() => setDocumentType(type.value)} className={`document-type-card${documentType === type.value ? " is-selected" : ""}`}>
                  <strong>{type.label}</strong><small>{type.hint}</small>
                </button>
              ))}
            </div>
            <p style={{ color: "#64748b", fontSize: 13 }}>PDF, JPG, PNG, WEBP · maximum 5 MB. Do not enter Aadhaar or PAN numbers in the label.</p>
            <div className="document-form-grid">
              <label className="document-field">What are you uploading?<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><span className="document-field-hint"><CheckCircle2 size={14} /> {selectedType.hint}</span></label>
              <label className="document-field">Document label <span>(optional)</span><input value={documentLabel} onChange={(event) => setDocumentLabel(event.target.value)} placeholder={`Example: ${selectedType.label}`} /><span className="document-field-hint">Do not write Aadhaar or PAN numbers here.</span></label>
              <label className="document-file-section">Choose file <span>PDF, JPG, PNG or WEBP · up to 5 MB</span><input className="document-file-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} />{file && <span className="document-selected-file"><FileText size={20} /><strong>{file.name}</strong><small>{formatFileSize(file.size)} · Ready as {selectedType.label}</small><button type="button" onClick={() => setFile(null)} aria-label="Remove selected file"><X size={16} /></button></span>}</label>
            </div>
            <button type="submit" disabled={uploading || !file} className="document-upload-submit">
              {uploading ? <><LoaderCircle size={16} className="spin" /> Uploading…</> : <><UploadCloud size={16} /> Upload securely</>}
            </button>
          </form>

          <section className="uploaded-documents-card">
            <div className="document-card-title"><span className="document-card-icon document-card-icon-soft"><FileText size={20} /></span><div><h2>My uploaded documents</h2><p>{loading ? "Checking your private vault..." : `${documents.length} document${documents.length === 1 ? "" : "s"} saved securely`}</p></div></div>
            {loading ? <p>Loading…</p> : documents.length === 0 ? <p style={{ color: "#64748b" }}>No documents uploaded yet.</p> : documents.map((document) => (
              <div key={document.id} className="uploaded-document-row">
                <div><strong>{document.document_label}</strong><div style={{ color: "#64748b", fontSize: 12 }}>{document.document_type.replaceAll("_", " ")} · {document.original_filename}</div></div>
                <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => openDocument(document)} title="Open securely"><Download size={16} /></button><button type="button" onClick={() => removeDocument(document)} title="Remove"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </section>
        </div>

        <aside className="employee-id-card">
          <div className="employee-id-company">DIZITAL ADDA</div>
          <div className="employee-id-title">OFFICIAL EMPLOYEE ID</div>
          <div className="employee-id-photo">
            {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Employee ID" /> : <><ImagePlus size={28} /><span>Upload ID photo</span></>}
          </div>
          {!profilePhotoUrl && <div className="employee-id-photo-note">Select <strong>ID Card Photo</strong> above to add your photo here.</div>}
          <div className="employee-id-name">{user?.full_name || "Employee"}</div>
          <div className="employee-id-designation">{user?.designation || user?.role || "Team Member"}</div>
          <div className="employee-id-department"><span>DEPARTMENT</span><strong>{user?.department_name || "Dizital Adda"}</strong></div>
          <div className="employee-id-number"><span>EMPLOYEE ID</span><strong>{user?.employee_code || `EMP-${user?.id || "-"}`}</strong></div>
          <button type="button" onClick={() => window.print()} className="employee-id-print"><IdCard size={16} /> Print ID Card</button>
        </aside>
      </section>
    </main>
  );
};

export default MyDocuments;
