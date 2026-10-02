import React, { useState, useEffect } from "react";
import {
  Globe,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
} from "lucide-react";
import { getAgencyLeads } from "../../services/leadService";

const AgencyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalRecords: 0 });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await getAgencyLeads({
        search: searchTerm,
        status: statusFilter,
        page: pagination.page,
        limit: 12,
      });

      if (res?.success || res?.data) {
        const leadData = res.data?.leads || res.leads || res.data || [];
        setLeads(Array.isArray(leadData) ? leadData : []);
        const pag = res.data?.pagination || res.pagination;
        if (pag) {
          setPagination({
            page: pag.page || 1,
            totalPages: pag.totalPages || 1,
            totalRecords: pag.totalRecords || leadData.length,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch agency leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, statusFilter, pagination.page]);

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          padding: "28px",
          color: "#ffffff",
          marginBottom: "24px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                style={{
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                }}
              >
                <Globe size={14} /> HR Direct Portal
              </span>
              <span
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                }}
              >
                www.dizitaladdaagency.com
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700", tracking: "-0.5px" }}>
              Agency Website Client Leads
            </h1>
            <p style={{ margin: "6px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>
              Inquiries & client project leads received directly from Agency Website (Confidential to HR & Executive Leadership).
            </p>
          </div>

          <button
            onClick={fetchLeads}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            }}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh Leads
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          border: "1px solid #e2e8f0",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            placeholder="Search by client name, email, phone, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} style={{ color: "#64748b" }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="INTERESTED">Interested</option>
            <option value="CONTACTED">Contacted</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="CLOSED">Closed / Converted</option>
          </select>
        </div>
      </div>

      {/* Leads Table / Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
          <RefreshCw size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "12px" }} />
          <p>Loading agency website leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "48px 24px",
            textAlign: "center",
            border: "1px solid #e2e8f0",
            color: "#64748b",
          }}
        >
          <AlertCircle size={40} style={{ color: "#94a3b8", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 6px 0", color: "#334155" }}>No Agency Leads Found</h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            {searchTerm ? "No client leads match your search criteria." : "No new agency client inquiries have been submitted yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
          {leads.map((lead) => {
            const budget = lead.budget || "N/A";
            const service = lead.service || lead.interested_course || "General Agency Inquiry";

            return (
              <div
                key={lead.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#2563eb",
                          background: "#eff6ff",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {lead.lead_code || `LEAD #${lead.id}`}
                      </span>
                      <h3 style={{ margin: "6px 0 0 0", fontSize: "17px", fontWeight: "700", color: "#0f172a" }}>
                        {lead.full_name || "Anonymous Client"}
                      </h3>
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        background: lead.status === "INTERESTED" ? "#dcfce7" : "#f1f5f9",
                        color: lead.status === "INTERESTED" ? "#166534" : "#475569",
                      }}
                    >
                      {lead.status || "NEW"}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: "#475569", marginBottom: "16px" }}>
                    {lead.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Mail size={14} style={{ color: "#64748b" }} /> {lead.email}
                      </div>
                    )}
                    {lead.mobile && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Phone size={14} style={{ color: "#64748b" }} /> {lead.mobile}
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Calendar size={14} style={{ color: "#64748b" }} />{" "}
                      {new Date(lead.captured_at || lead.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Service & Budget Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    <div
                      style={{
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        color: "#0369a1",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Briefcase size={14} /> Service: {service}
                    </div>

                    {budget !== "N/A" && (
                      <div
                        style={{
                          background: "#fdf4ff",
                          border: "1px solid #f5d0fe",
                          color: "#86198f",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <DollarSign size={14} /> Budget: {budget}
                      </div>
                    )}
                  </div>

                  {/* Inquiry Snippet */}
                  {lead.remarks && (
                    <div
                      style={{
                        background: "#f8fafc",
                        borderLeft: "3px solid #3b82f6",
                        padding: "10px 12px",
                        borderRadius: "0 8px 8px 0",
                        fontSize: "13px",
                        color: "#334155",
                        marginBottom: "16px",
                        lineHeight: "1.4",
                      }}
                    >
                      <strong>Inquiry Summary:</strong>
                      <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>{lead.remarks}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedLead(lead)}
                  style={{
                    width: "100%",
                    background: "#f1f5f9",
                    color: "#1e293b",
                    border: "1px solid #cbd5e1",
                    padding: "8px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Eye size={16} /> View Complete Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "700" }}>
                  {selectedLead.lead_code || `LEAD #${selectedLead.id}`}
                </span>
                <h2 style={{ margin: "2px 0 0 0", fontSize: "20px", color: "#0f172a" }}>
                  {selectedLead.full_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
              <div>
                <label style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>Source Domain</label>
                <div style={{ fontWeight: "600", color: "#0284c7" }}>{selectedLead.domain || "www.dizitaladdaagency.com"}</div>
              </div>

              <div>
                <label style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>Email & Phone</label>
                <div style={{ fontWeight: "500" }}>📧 {selectedLead.email || "N/A"}</div>
                <div style={{ fontWeight: "500" }}>📞 {selectedLead.mobile || "N/A"}</div>
              </div>

              <div>
                <label style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>Service Required</label>
                <div style={{ fontWeight: "600", color: "#1e293b" }}>{selectedLead.service || selectedLead.interested_course || "Agency Inquiry"}</div>
              </div>

              {selectedLead.budget && (
                <div>
                  <label style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>Budget Range</label>
                  <div style={{ fontWeight: "600", color: "#86198f" }}>{selectedLead.budget}</div>
                </div>
              )}

              <div>
                <label style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>Project Details & Message</label>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#334155", lineHeight: "1.5" }}>
                  {selectedLead.remarks || "No additional project description provided."}
                </div>
              </div>

              <div>
                <label style={{ color: "#64748b", fontSize: "12px", fontWeight: "600" }}>Captured Timestamp</label>
                <div style={{ color: "#475569" }}>
                  {new Date(selectedLead.captured_at || selectedLead.created_at).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", textAlign: "right" }}>
              <button
                onClick={() => setSelectedLead(null)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyLeads;
