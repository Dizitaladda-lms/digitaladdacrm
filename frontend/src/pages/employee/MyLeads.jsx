import React, { useEffect, useState, useCallback } from "react";
import "./MyLeads.css";
import MyLeadsHeader from "../../components/employee/myLeads/MyLeadsHeader/MyLeadsHeader";
import SearchFilterBar from "../../components/employee/myLeads/SearchFilterBar/SearchFilterBar";
import LeadsTable from "../../components/employee/myLeads/LeadsTable/LeadsTable";
import { getMyLeads } from "../../services/employeeLeadService";
import { exportToCsv } from "../../utils/exportCsv";

const MyLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live Active Filter State
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [source, setSource] = useState("ALL");

  const fetchMyLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (domain !== "ALL") params.domain = domain;
      if (status !== "ALL") params.status = status;
      if (priority !== "ALL") params.priority = priority;
      if (source !== "ALL") params.source = source;

      const response = await getMyLeads(params);
      const list = response?.data?.leads || response?.leads || response?.data || [];
      setLeads(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [search, domain, status, priority, source]);

  useEffect(() => {
    fetchMyLeads();
  }, [fetchMyLeads]);

  const handleResetFilters = () => {
    setSearch("");
    setDomain("ALL");
    setStatus("ALL");
    setPriority("ALL");
    setSource("ALL");
  };

  const handleExportCsv = () => {
    exportToCsv(
      `Dizital_Adda_MyLeads_${new Date().toISOString().slice(0, 10)}.csv`,
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
    <div className="my-leads-page">
      <MyLeadsHeader onExport={handleExportCsv} />

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
        onReset={handleResetFilters}
      />

      <LeadsTable
        leads={leads}
        loading={loading}
        onRefresh={fetchMyLeads}
      />
    </div>
  );
};

export default MyLeads;