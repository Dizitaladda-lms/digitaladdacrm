import React, { useEffect, useMemo, useState } from "react";
import { Badge, Download, FileText, IdCard, ImagePlus, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import {
  deleteMyEmployeeDocument,
  getMyEmployeeDocumentAccessUrl,
  getMyEmployeeDocuments,
  uploadMyEmployeeDocument,
} from "../../services/employeeDocumentService";

const DOC_TYPES = [
  ["AADHAAR_CARD", "Aadhaar Card"],
  ["PAN_CARD", "PAN Card"],
  ["OFFICE_DOCUMENT", "Office Document"],
  ["OTHER", "Other Document"],
  ["PROFILE_PHOTO", "ID Card Photo"],
];

const MyDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("AADHAAR_CARD");
  const [documentLabel, setDocumentLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

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
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "#0f172a" }}>My Documents & ID Card</h1>
        <p style={{ color: "#64748b", marginBottom: 0 }}>Upload your own identity and office documents. Only you can access these files.</p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 390px)", gap: 20, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 20 }}>
          <form onSubmit={uploadDocument} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}><UploadCloud size={18} style={{ verticalAlign: "-3px", marginRight: 7 }} />Secure document upload</h2>
            <p style={{ color: "#64748b", fontSize: 13 }}>PDF, JPG, PNG, WEBP · maximum 5 MB. Do not enter Aadhaar or PAN numbers in the label.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>Document type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)} style={{ width: "100%" }}>{DOC_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Label (optional)<input value={documentLabel} onChange={(event) => setDocumentLabel(event.target.value)} placeholder="e.g. Aadhaar front" /></label>
              <label style={{ gridColumn: "1 / -1" }}>File<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
            </div>
            <button type="submit" disabled={uploading} style={{ marginTop: 16 }}>
              {uploading ? <><LoaderCircle size={16} className="spin" /> Uploading…</> : <><UploadCloud size={16} /> Upload securely</>}
            </button>
          </form>

          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}><FileText size={18} style={{ verticalAlign: "-3px", marginRight: 7 }} />My uploaded documents</h2>
            {loading ? <p>Loading…</p> : documents.length === 0 ? <p style={{ color: "#64748b" }}>No documents uploaded yet.</p> : documents.map((document) => (
              <div key={document.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid #f1f5f9" }}>
                <div><strong>{document.document_label}</strong><div style={{ color: "#64748b", fontSize: 12 }}>{document.document_type.replaceAll("_", " ")} · {document.original_filename}</div></div>
                <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => openDocument(document)} title="Open securely"><Download size={16} /></button><button type="button" onClick={() => removeDocument(document)} title="Remove"><Trash2 size={16} /></button></div>
              </div>
            ))}
          </section>
        </div>

        <aside style={{ background: "linear-gradient(145deg, #0f172a, #1d4ed8)", color: "#fff", borderRadius: 18, padding: 22, minHeight: 300, boxShadow: "0 12px 28px rgba(30,64,175,.2)" }}>
          <div style={{ fontSize: 12, letterSpacing: ".14em", fontWeight: 800, opacity: .8 }}>DIZITAL ADDA</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>OFFICIAL EMPLOYEE ID</div>
          <div style={{ width: 108, height: 126, margin: "22px auto 14px", borderRadius: 12, background: "#e2e8f0", border: "3px solid rgba(255,255,255,.65)", display: "grid", placeItems: "center", overflow: "hidden", color: "#475569" }}>
            {profilePhotoUrl ? <img src={profilePhotoUrl} alt="Employee ID" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <><ImagePlus size={28} /><span style={{ fontSize: 10 }}>Upload ID photo</span></>}
          </div>
          <div style={{ textAlign: "center", fontSize: 18, fontWeight: 800 }}>{user?.full_name || "Employee"}</div>
          <div style={{ textAlign: "center", opacity: .84, fontSize: 13, marginTop: 3 }}>{user?.designation || user?.role || "Team Member"}</div>
          <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.25)", display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>EMPLOYEE ID</span><strong>{user?.employee_code || `EMP-${user?.id || "—"}`}</strong></div>
          <button type="button" onClick={() => window.print()} style={{ width: "100%", marginTop: 18, background: "#fff", color: "#1d4ed8" }}><IdCard size={16} /> Print ID Card</button>
        </aside>
      </section>
    </main>
  );
};

export default MyDocuments;
