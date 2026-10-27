import { useEffect, useMemo, useState } from "react";
import {
  Building,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FolderOpen,
  IdCard,
  Image as ImageIcon,
  LoaderCircle,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getHREmployeeDocumentAccessUrl,
  getHREmployeeDocuments,
} from "../../services/employeeDocumentService";
import { getEmployees } from "../../services/employeeService";
import "./EmployeeDocuments.css";

const DOC_TYPE_META = {
  AADHAAR_CARD: {
    label: "Aadhaar Card",
    badgeBg: "#ecfdf5",
    badgeColor: "#065f46",
    badgeBorder: "#a7f3d0",
    icon: IdCard,
    shortName: "Aadhaar",
  },
  PAN_CARD: {
    label: "PAN Card",
    badgeBg: "#eff6ff",
    badgeColor: "#1e40af",
    badgeBorder: "#bfdbfe",
    icon: IdCard,
    shortName: "PAN",
  },
  BANK_DETAILS: {
    label: "Bank Details (Passbook / Cheque)",
    badgeBg: "#fffbeb",
    badgeColor: "#92400e",
    badgeBorder: "#fde68a",
    icon: CreditCard,
    shortName: "Bank",
  },
  PROFILE_PHOTO: {
    label: "Official ID Card Photo",
    badgeBg: "#f5f3ff",
    badgeColor: "#6b21a8",
    badgeBorder: "#ddd6fe",
    icon: ImageIcon,
    shortName: "ID Photo",
  },
  OFFICE_DOCUMENT: {
    label: "Office Document",
    badgeBg: "#f8fafc",
    badgeColor: "#334155",
    badgeBorder: "#cbd5e1",
    icon: Building,
    shortName: "Office Doc",
  },
  OTHER: {
    label: "Other Document",
    badgeBg: "#f1f5f9",
    badgeColor: "#475569",
    badgeBorder: "#e2e8f0",
    icon: FileText,
    shortName: "Other",
  },
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (isoString) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const EmployeeDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'uploaded', 'pending'
  const [loading, setLoading] = useState(true);

  // Dedicated Employee Vault Modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openingDocId, setOpeningDocId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docRes, empRes] = await Promise.allSettled([
        getHREmployeeDocuments(),
        getEmployees({ limit: 500 }),
      ]);

      const docList =
        docRes.status === "fulfilled" && Array.isArray(docRes.value?.data)
          ? docRes.value.data
          : [];
      setDocuments(docList);

      const empList =
        empRes.status === "fulfilled" && Array.isArray(empRes.value?.data)
          ? empRes.value.data
          : [];
      setAllEmployees(empList);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not load employee documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedEmployee(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Group all documents cleanly by employee (Zero Mixing)
  const groupedEmployees = useMemo(() => {
    const docsByEmpId = new Map();

    // 1. Group documents by employee_id
    for (const doc of documents) {
      const empId = Number(doc.employee_id);
      if (!empId) continue;
      if (!docsByEmpId.has(empId)) {
        docsByEmpId.set(empId, {
          employee_id: empId,
          employee_name: doc.employee_name || "Unknown Employee",
          employee_code: doc.employee_code || "",
          designation: doc.designation || "",
          employee_email: doc.employee_email || "",
          department_name: doc.department_name || "",
          documents: [],
        });
      }
      docsByEmpId.get(empId).documents.push(doc);
    }

    // 2. Incorporate active company employees who might not have uploaded documents yet
    for (const emp of allEmployees) {
      const empId = Number(emp.id);
      if (!empId) continue;
      if (!docsByEmpId.has(empId)) {
        docsByEmpId.set(empId, {
          employee_id: empId,
          employee_name: emp.full_name || emp.name || "Unknown",
          employee_code: emp.employee_code || "",
          designation: emp.designation || "",
          employee_email: emp.email || "",
          department_name:
            emp.department_name || emp.department?.department_name || "",
          documents: [],
        });
      }
    }

    const list = Array.from(docsByEmpId.values());

    // Sort: Employees with uploaded documents first, then alphabetically
    return list.sort((a, b) => {
      if (b.documents.length !== a.documents.length) {
        return b.documents.length - a.documents.length;
      }
      return a.employee_name.localeCompare(b.employee_name);
    });
  }, [documents, allEmployees]);

  // Filtered employees based on search & dropdowns
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupedEmployees.filter((emp) => {
      // 1. Search Query Match
      if (q) {
        const matchesName = emp.employee_name?.toLowerCase().includes(q);
        const matchesCode = emp.employee_code?.toLowerCase().includes(q);
        const matchesEmail = emp.employee_email?.toLowerCase().includes(q);
        const matchesRole = emp.designation?.toLowerCase().includes(q);
        const matchesDept = emp.department_name?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail && !matchesRole && !matchesDept) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === "uploaded" && emp.documents.length === 0) return false;
      if (statusFilter === "pending" && emp.documents.length > 0) return false;

      // 3. Document Type Filter
      if (selectedDocType) {
        return emp.documents.some((d) => d.document_type === selectedDocType);
      }

      return true;
    });
  }, [groupedEmployees, search, statusFilter, selectedDocType]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalEmployees = groupedEmployees.length;
    const employeesWithDocs = groupedEmployees.filter((e) => e.documents.length > 0).length;
    const totalDocs = documents.length;
    return { totalEmployees, employeesWithDocs, totalDocs };
  }, [groupedEmployees, documents]);

  // Open secure signed document URL
  const openDocument = async (document) => {
    try {
      setOpeningDocId(document.id);
      const response = await getHREmployeeDocumentAccessUrl(document.id);
      if (response?.data?.access_url) {
        window.open(response.data.access_url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Document link unavailable.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not open this document.");
    } finally {
      setOpeningDocId(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return "EM";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <section className="hr-employee-documents">
      {/* Header Banner */}
      <header className="hr-documents-header">
        <div className="hr-documents-header-left">
          <span>
            <ShieldCheck size={14} /> HR CONFIDENTIAL VAULT
          </span>
          <h2>Employee Documents Directory</h2>
          <p>
            Har employee ke sabhi documents alag vault me dekhein taaki koi bhi record mix na ho.
          </p>
        </div>

        <div className="hr-documents-header-stats">
          <div className="hr-stat-pill">
            <small>Employees With Docs</small>
            <strong>
              {stats.employeesWithDocs} / {stats.totalEmployees}
            </strong>
          </div>
          <div className="hr-stat-pill">
            <small>Total Documents</small>
            <strong>{stats.totalDocs}</strong>
          </div>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="hr-documents-filter-bar">
        <div className="hr-search-input-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, code, designation, department or email..."
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{ border: 0, background: "transparent", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          className="hr-filter-select"
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
        >
          <option value="">All Document Types</option>
          {Object.entries(DOC_TYPE_META).map(([val, meta]) => (
            <option key={val} value={val}>
              {meta.label}
            </option>
          ))}
        </select>

        <select
          className="hr-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Employees ({groupedEmployees.length})</option>
          <option value="uploaded">Uploaded Documents ({stats.employeesWithDocs})</option>
          <option value="pending">
            Pending / No Docs ({stats.totalEmployees - stats.employeesWithDocs})
          </option>
        </select>
      </div>

      {/* Main List: Employees Grouped (Zero Mixing) */}
      {loading ? (
        <div className="hr-documents-empty-box">
          <LoaderCircle size={28} className="spin" style={{ color: "#2563eb" }} />
          <strong>Loading employee documents vault...</strong>
          <p>Checking confidential records safely...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="hr-documents-empty-box">
          <FileText size={32} style={{ color: "#94a3b8" }} />
          <strong>Koi matching employee nahi mila</strong>
          <p>Search query ya filter criteria badal kar dobara try karein.</p>
        </div>
      ) : (
        <div className="hr-employee-cards-list">
          {filteredEmployees.map((emp) => {
            const hasDocs = emp.documents.length > 0;
            const empDocTypes = new Set(emp.documents.map((d) => d.document_type));

            return (
              <article className="hr-employee-card" key={emp.employee_id}>
                {/* Left: Employee Info */}
                <div className="hr-emp-profile-col">
                  <div className="hr-emp-avatar">{getInitials(emp.employee_name)}</div>
                  <div className="hr-emp-info">
                    <div className="hr-emp-name-row">
                      <strong>{emp.employee_name}</strong>
                      {emp.employee_code && (
                        <span className="hr-emp-code-badge">{emp.employee_code}</span>
                      )}
                    </div>
                    <div className="hr-emp-role-row">
                      {emp.designation || "Team Member"} ·{" "}
                      {emp.department_name || "General Department"}
                    </div>
                    {emp.employee_email && (
                      <div className="hr-emp-email-row">{emp.employee_email}</div>
                    )}
                  </div>
                </div>

                {/* Middle: Document Checklist */}
                <div className="hr-emp-docs-col">
                  <div className="hr-emp-docs-header">
                    <span
                      className={`hr-emp-docs-count ${
                        hasDocs ? "has-docs" : "no-docs"
                      }`}
                    >
                      {hasDocs
                        ? `${emp.documents.length} Document${
                            emp.documents.length === 1 ? "" : "s"
                          } Available`
                        : "No Documents Uploaded"}
                    </span>
                  </div>

                  <div className="hr-emp-checklist">
                    {["AADHAAR_CARD", "PAN_CARD", "BANK_DETAILS", "PROFILE_PHOTO"].map(
                      (typeKey) => {
                        const meta = DOC_TYPE_META[typeKey];
                        const isPresent = empDocTypes.has(typeKey);
                        return (
                          <span
                            key={typeKey}
                            className={`hr-check-chip ${
                              isPresent ? "is-present" : "is-missing"
                            }`}
                          >
                            {isPresent ? "✓" : "—"} {meta.shortName}
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Right: View Documents Action */}
                <div className="hr-emp-action-col">
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    disabled={!hasDocs}
                    className={`hr-view-docs-btn ${!hasDocs ? "is-disabled" : ""}`}
                    title={
                      hasDocs
                        ? `View all ${emp.documents.length} documents for ${emp.employee_name}`
                        : "No documents uploaded by this employee"
                    }
                  >
                    <FolderOpen size={16} />
                    View Documents ({emp.documents.length})
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============================================================
          EMPLOYEE DOCUMENTS VAULT MODAL (ALL DOCS OF SELECTED EMPLOYEE)
          ============================================================ */}
      {selectedEmployee && (
        <div
          className="hr-doc-modal-overlay"
          onClick={() => setSelectedEmployee(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="hr-doc-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <header className="hr-doc-modal-header">
              <div className="hr-doc-modal-title">
                <div className="hr-doc-modal-avatar">
                  {getInitials(selectedEmployee.employee_name)}
                </div>
                <div>
                  <h3>{selectedEmployee.employee_name} · Document Vault</h3>
                  <p>
                    {selectedEmployee.employee_code && (
                      <span style={{ fontWeight: 700, color: "#0f172a", marginRight: 6 }}>
                        {selectedEmployee.employee_code}
                      </span>
                    )}
                    {selectedEmployee.designation || "Employee"} ·{" "}
                    {selectedEmployee.department_name || "General Department"}
                    {selectedEmployee.employee_email && (
                      <span> · {selectedEmployee.employee_email}</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="hr-doc-modal-close-btn"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Body */}
            <div className="hr-doc-modal-body">
              <div className="hr-vault-notice">
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Confidential Employee Records:</strong> Ye sabhi documents sirf{" "}
                  <strong>{selectedEmployee.employee_name}</strong> ke hain. Sabhi numbers aur
                  details encrypted storage se safely display ho rahi hain.
                </div>
              </div>

              {selectedEmployee.documents.length === 0 ? (
                <div className="hr-documents-empty-box" style={{ padding: "30px 16px" }}>
                  <FileText size={28} style={{ color: "#94a3b8" }} />
                  <strong>Is employee ne abhi tak koi document upload nahi kiya hai.</strong>
                </div>
              ) : (
                selectedEmployee.documents.map((doc) => {
                  const meta = DOC_TYPE_META[doc.document_type] || DOC_TYPE_META.OTHER;
                  const IconComp = meta.icon || FileText;
                  const isOpening = openingDocId === doc.id;

                  return (
                    <article className="hr-vault-card" key={doc.id}>
                      {/* Top Header of Document Card */}
                      <div className="hr-vault-card-header">
                        <span
                          className="hr-vault-type-badge"
                          style={{
                            background: meta.badgeBg,
                            color: meta.badgeColor,
                            borderColor: meta.badgeBorder,
                          }}
                        >
                          <IconComp size={14} /> {meta.label}
                        </span>

                        <span className="hr-vault-date">
                          Uploaded: {formatDate(doc.created_at)}
                        </span>
                      </div>

                      {/* Main Details */}
                      <div className="hr-vault-card-main">
                        <div className="hr-vault-details-col">
                          <strong>{doc.document_label}</strong>
                          <span className="hr-vault-filename">
                            Original File: {doc.original_filename}{" "}
                            {doc.size_bytes ? `(${formatFileSize(doc.size_bytes)})` : ""}
                          </span>

                          {/* Decrypted Document / Account Number */}
                          {doc.document_number && (
                            <div className="hr-vault-num-box">
                              <span>
                                {doc.document_type === "BANK_DETAILS"
                                  ? "Account No.:"
                                  : doc.document_type === "AADHAAR_CARD"
                                  ? "Aadhaar No.:"
                                  : doc.document_type === "PAN_CARD"
                                  ? "PAN No.:"
                                  : "Document / Ref No.:"}
                              </span>
                              <strong>{doc.document_number}</strong>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(doc.document_number);
                                  toast.success("Number copied!");
                                }}
                                title="Copy number"
                                style={{
                                  border: 0,
                                  background: "transparent",
                                  cursor: "pointer",
                                  color: "#64748b",
                                  display: "grid",
                                  placeItems: "center",
                                  marginLeft: 4,
                                }}
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          )}

                          {/* Structured Details Chips */}
                          {doc.document_details && (
                            <div className="hr-vault-chips-wrap">
                              {doc.document_details.split(" | ").map((part, idx) => (
                                <span key={idx} className="hr-vault-chip">
                                  {part}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Open Button */}
                        <button
                          type="button"
                          className="hr-open-doc-btn"
                          onClick={() => openDocument(doc)}
                          disabled={isOpening}
                        >
                          {isOpening ? (
                            <>
                              <LoaderCircle size={15} className="spin" /> Opening…
                            </>
                          ) : (
                            <>
                              <ExternalLink size={15} /> Open File Proof
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <footer className="hr-doc-modal-footer">
              <button
                type="button"
                className="hr-doc-modal-footer-close"
                onClick={() => setSelectedEmployee(null)}
              >
                Close Vault
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
};

export default EmployeeDocuments;
