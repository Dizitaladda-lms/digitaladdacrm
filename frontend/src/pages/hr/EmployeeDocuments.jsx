import { useEffect, useState } from "react";
import { Download, FileText, Search, ShieldCheck, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import {
  getHREmployeeDocumentAccessUrl,
  getHREmployeeDocuments,
} from "../../services/employeeDocumentService";
import "./EmployeeDocuments.css";

const TYPE_LABELS = {
  AADHAAR_CARD: "Aadhaar Card",
  PAN_CARD: "PAN Card",
  OFFICE_DOCUMENT: "Office Document",
  OTHER: "Other Document",
  PROFILE_PHOTO: "ID Card Photo",
};

const EmployeeDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDocuments = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await getHREmployeeDocuments(filters);
      setDocuments(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load employee documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const applyFilters = (event) => {
    event.preventDefault();
    loadDocuments({ search: search.trim() || undefined, document_type: documentType || undefined });
  };

  const openDocument = async (document) => {
    try {
      const response = await getHREmployeeDocumentAccessUrl(document.id);
      window.open(response?.data?.access_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not open this document.");
    }
  };

  return (
    <section className="hr-employee-documents">
      <header className="hr-documents-header">
        <div><span><ShieldCheck size={15} /> HR CONFIDENTIAL</span><h2>Employee Documents</h2><p>View securely uploaded documents for all employees.</p></div>
        <div className="hr-documents-count">{documents.length} documents</div>
      </header>

      <form className="hr-documents-filter" onSubmit={applyFilters}>
        <label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name, ID or email" /></label>
        <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
          <option value="">All document types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        <button type="submit">Search</button>
      </form>

      <div className="hr-documents-list">
        {loading ? <p className="hr-documents-empty">Loading employee documents...</p> : documents.length === 0 ? <p className="hr-documents-empty">No employee documents found for this filter.</p> : documents.map((document) => (
          <article className="hr-document-row" key={document.id}>
            <span className="hr-document-avatar"><UserRound size={21} /></span>
            <div className="hr-document-person"><strong>{document.employee_name}</strong><span>{document.employee_code || "Employee ID unavailable"} · {document.designation || "Team member"}</span><small>{document.department_name || "No department"}</small></div>
            <div className="hr-document-file"><span>{TYPE_LABELS[document.document_type] || document.document_type}</span><strong>{document.document_label}</strong><small>{document.original_filename}</small></div>
            <button type="button" onClick={() => openDocument(document)}><Download size={16} /> Open</button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default EmployeeDocuments;
