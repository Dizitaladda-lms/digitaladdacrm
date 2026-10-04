import React, { useEffect, useState, useCallback } from "react";
import "./ManagerMyLeads.css";
import MyLeadsStats from "../../components/LeadManagement/MyLeadsStats";
import SearchFilterBar from "../../components/employee/myLeads/SearchFilterBar/SearchFilterBar";
import LeadsTable from "../../components/employee/myLeads/LeadsTable/LeadsTable";
import { getMyLeads } from "../../services/employeeLeadService";
import { exportToCsv } from "../../utils/exportCsv";
import { useAuth } from "../../context/AuthContext";
import CreateLeadModal from "../../components/LeadManagement/CreateLeadModal";
import { UserCircle, Download, PlusCircle } from "lucide-react";

const ManagerMyLeads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (domain !== "ALL") params.domain = domain;
      if (status !== "ALL") params.status = status;
      if (priority !== "ALL") params.priority = priority;
      if (source !== "ALL") params.source = source;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await getMyLeads(params);
      const list =
        response?.data?.leads || response?.leads || response?.data || [];
      setLeads(Array.isArray(list) ? list : []);
    } catch (error) {
      console.warn("Failed fetching my leads:", error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search, domain, status, priority, source, dateFrom, dateTo]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleResetFilters = () => {
    setSearch("");
    setDomain("ALL");
    setStatus("ALL");
    setPriority("ALL");
    setSource("ALL");
    setDateFrom("");
    setDateTo("");
  };

  const handleExportCsv = () => {
    exportToCsv(
      `Manager_MyLeads_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: "Lead Code", key: "lead_code" },
        { header: "Domain", key: "domain" },
        { header: "Student Name", key: "full_name" },
        { header: "Mobile", key: "mobile" },
        { header: "Email", key: "email" },
        { header: "Interested Course", key: "interested_course" },
        { header: "Status", key: "status" },
        { header: "Priority", key: "priority" },
        { header: "Source", key: "source" },
        { header: "Remarks", key: "remarks" },
        { header: "Created Date", key: "created_at" },
      ],
      leads
    );
  };

  return (
    <div className="manager-my-leads-page">
      {/* Page Header */}
      <div className="mml-header">
        <div className="mml-header-left">
          <UserCircle size={28} className="mml-header-icon" />
          <div>
            <h1 className="mml-title">My Leads</h1>
            <p className="mml-subtitle">
              Leads personally assigned to you — manage, follow up, and convert.
            </p>
          </div>
        </div>
        <div className="mml-header-actions">
          <button className="mml-btn mml-btn-outline" onClick={handleExportCsv}>
            <Download size={16} />
            Export CSV
          </button>
          <button
            className="mml-btn mml-btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            <PlusCircle size={16} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <MyLeadsStats loading={loading} leads={leads} />

      {/* Filters */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        domain={domain}
        onDomainChange={setDomain}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
        source={source}
        onSourceChange={setSource}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onReset={handleResetFilters}
      />

      {/* Leads Table */}
      <LeadsTable
        leads={leads}
        loading={loading}
        onRefresh={fetchLeads}
        currentUser={user || {}}
      />

      {/* Create Lead Modal */}
      <CreateLeadModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchLeads}
        currentUserRole="MANAGER"
      />
    </div>
  );
};

export default ManagerMyLeads;
