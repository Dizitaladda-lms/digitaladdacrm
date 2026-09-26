import { useCallback, useEffect, useState } from "react";

import "./LeadManagement.css";

import LeadHeader from "../../components/LeadManagement/LeadHeader";
import LeadStats from "../../components/LeadManagement/LeadStats";
import LeadFilters from "../../components/LeadManagement/LeadFilters";
import BulkActionBar from "../../components/LeadManagement/BulkActionBar";
import LeadTable from "../../components/LeadManagement/LeadTable";
import LeadPagination from "../../components/LeadManagement/LeadPagination";
import LeadAssignmentModal
from "../../components/LeadManagement/LeadAssignmentModal";
import { getEmployees } from "../../services/employeeService";
import {
  getLeads,
  getLeadStats,
  deleteLead,
  deleteBulkLeads,
} from "../../services/leadService";

import {
  assignLead,
  assignBulkLeads,
} from "../../services/leadAssignmentService";
import LeadDetailsDrawer from "../../components/common/LeadDetailsDrawer/LeadDetailsDrawer";
import DeleteLeadModal from "../../components/LeadManagement/DeleteLeadModal";
import CreateLeadModal from "../../components/LeadManagement/CreateLeadModal";
import ImportLeadsModal from "../../components/LeadManagement/ImportLeadsModal";
import BulkOutreachModal from "../../components/LeadManagement/BulkOutreachModal";
import { useAuth } from "../../context/AuthContext";
import { exportToCsv } from "../../utils/exportCsv";
const LeadManagement = () => {
  const { user } = useAuth();
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [outreachChannel, setOutreachChannel] = useState("WHATSAPP");

  /*
  =====================================
  State
  =====================================
  */

const [employees,setEmployees]=useState([]);

const [assignModal,setAssignModal]=useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState([]);

  const [selectedLeads, setSelectedLeads] = useState([]);

  const [stats, setStats] = useState({

    total_leads: 0,

    today_leads: 0,

    assigned_leads: 0,

    unassigned_leads: 0,

    duplicate_leads: 0,

  });

  const [pagination, setPagination] = useState({

    page: 1,

    limit: 10,

    totalPages: 1,

    totalRecords: 0,

  });

  const [filters, setFilters] = useState({

    search: "",

    status: "",

    source: "",

    assigned_to: "",

    domain: "",

  });

  const [drawerOpen, setDrawerOpen] = useState(false);

const [selectedLead, setSelectedLead] = useState(null)

const [assignMode, setAssignMode] = useState("bulk");



/*
=====================================
Delete Lead
=====================================
*/

const [deleteModalOpen, setDeleteModalOpen] = useState(false);

const [selectedDeleteLead, setSelectedDeleteLead] = useState(null);

const [deleteLoading, setDeleteLoading] = useState(false);

const [isBulkDelete, setIsBulkDelete] = useState(false);

  /*
  =====================================
  Load Leads
  =====================================
  */
const closeAssignModal=()=>{

setAssignModal(false);

};


  const loadLeads = useCallback(async () => {

    try {

      setLoading(true);

     const [

    leadResponse,

    statsResponse,

    employeeResponse,

] = await Promise.all([

    getLeads({

        page: pagination.page,

        limit: pagination.limit,

        ...filters,
      }),
      getLeadStats(filters),
      getEmployees(),
    ]);

    setLeads(leadResponse?.data?.leads || leadResponse?.leads || []);
    setPagination(leadResponse?.data?.pagination || pagination);
    setStats(statsResponse?.data || {});
    setEmployees(employeeResponse?.data?.employees || employeeResponse?.employees || []);
  } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }

  }, [

    pagination.page,

    pagination.limit,

    filters,

  ]);

  useEffect(() => {

    loadLeads();

  }, [loadLeads]);

  /*
  =====================================
  Filters
  =====================================
  */

  const handleFilterChange = (

    field,

    value

  ) => {

    setPagination((prev) => ({

      ...prev,

      page: 1,

    }));

    setFilters((prev) => ({

      ...prev,

      [field]: value,

    }));

  };

  /*
  =====================================
  Reset
  =====================================
  */

  const handleResetFilters = () => {

    setFilters({

      search: "",

      status: "",

      source: "",

      assigned_to: "",

      domain: "",

    });

  };

  /*
  =====================================
  Pagination
  =====================================
  */

  const handlePageChange = (

    page

  ) => {

    setPagination((prev)=>({

      ...prev,

      page,

    }));

  };

 /*
  =====================================
  hnandle aggsise
  =====================================
  */
const handleAssign = async (payload) => {

  try {

    setLoading(true);

    if (assignMode === "single") {

      await assignLead(

        selectedLead.id,

        payload.employee_id

      );

    } else {

      await assignBulkLeads({

        lead_ids: selectedLeads,

        employee_id: payload.employee_id,

      });

    }

    setAssignModal(false);

    setSelectedLead(null);

    setSelectedLeads([]);

    await loadLeads();

    alert("Lead Assigned Successfully");

  } catch (error) {

    console.error(error);

    alert(

      error?.response?.data?.message ||

      "Assignment Failed"

    );

  } finally {

    setLoading(false);

  }

};


/*
=====================================
View Lead
=====================================
*/

const handleViewLead = (lead) => {

  setSelectedLead(lead);

  setDrawerOpen(true);

};

/*
=====================================
Close Drawer
=====================================
*/

const handleCloseDrawer = () => {

  setDrawerOpen(false);

  setSelectedLead(null);

};

;

/*
=====================================
Delete Lead
=====================================
*/

/*
=====================================
Delete Lead
=====================================
*/

const handleDeleteClick = (lead) => {
  setIsBulkDelete(false);
  setSelectedDeleteLead(lead);
  setDeleteModalOpen(true);
};

const handleBulkDeleteClick = () => {
  if (selectedLeads.length === 0) return;
  setIsBulkDelete(true);
  setSelectedDeleteLead(null);
  setDeleteModalOpen(true);
};

const handleCloseDeleteModal = () => {
  setDeleteModalOpen(false);
  setSelectedDeleteLead(null);
  setIsBulkDelete(false);
};

const handleDeleteLead = async () => {
  try {
    setDeleteLoading(true);

    if (isBulkDelete) {
      if (selectedLeads.length === 0) return;
      const count = selectedLeads.length;
      await deleteBulkLeads(selectedLeads);
      alert(`${count} leads deleted successfully.`);
      setSelectedLeads([]);
    } else {
      if (!selectedDeleteLead) return;
      await deleteLead(selectedDeleteLead.id);
      alert("Lead deleted successfully.");
    }

    handleCloseDeleteModal();
    await loadLeads();
  } catch (error) {
    console.error(error);
    alert(error?.response?.data?.message || "Failed to delete lead(s).");
  } finally {
    setDeleteLoading(false);
  }
};

const handleBulkExport = () => {
  if (selectedLeads.length === 0) return;
  const leadsToExport = leads.filter((l) => selectedLeads.includes(l.id));
  if (leadsToExport.length === 0) return;

  const columns = [
    { header: "Lead Code", key: "lead_code" },
    { header: "Full Name", key: "full_name" },
    { header: "Mobile", key: "mobile" },
    { header: "Email", key: "email" },
    { header: "Status", key: "status" },
    { header: "Source", key: "source" },
    { header: "Domain", key: "domain" },
    { header: "Interested Course", key: "interested_course" },
    { header: "Assigned Employee", key: "assigned_employee" },
  ];

  exportToCsv(`selected_leads_${Date.now()}`, columns, leadsToExport);
};

const handleSingleAssign = (lead) => {

  setAssignMode("single");

  setSelectedLead(lead);

  setAssignModal(true);

};

const openAssignModal = () => {

  if (selectedLeads.length === 0) return;

  setAssignMode("bulk");

  setSelectedLead(null);

  setAssignModal(true);

};

  const handleExportAdminLeadsCsv = () => {
    exportToCsv(
      `Dizital_Adda_Leads_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: "Lead Code", key: "lead_code" },
        { header: "Domain", key: "domain" },
        { header: "Full Name", key: "full_name" },
        { header: "Mobile", key: "mobile" },
        { header: "Email", key: "email" },
        { header: "Course", key: "interested_course" },
        { header: "Preferred Batch", key: "preferred_Batch" },
        { header: "Source", key: "source" },
        { header: "Status", key: "status" },
        { header: "Priority", key: "priority" },
        { header: "Counsellor", key: "assigned_to_name" },
        { header: "Created Date", key: "created_at" },
      ],
      leads
    );
  };

  return (

    <div className="lead-management-page">

      <LeadHeader

        loading={loading}

        onRefresh={loadLeads}
        onExport={handleExportAdminLeadsCsv}
        onImport={() => setImportModalOpen(true)}
        onCreateLead={() => setCreateModalOpen(true)}

      />

      <LeadStats

        loading={loading}

        stats={stats}

      />

      <LeadFilters

        filters={filters}

        onChange={handleFilterChange}

        onReset={handleResetFilters}

      />

      {
        selectedLeads.length > 0 && (
          <BulkActionBar
            selectedLeads={selectedLeads}
            onWhatsApp={() => {
              setOutreachChannel("WHATSAPP");
              setOutreachModalOpen(true);
            }}
            onEmail={() => {
              setOutreachChannel("EMAIL");
              setOutreachModalOpen(true);
            }}
            onSMS={() => {
              setOutreachChannel("SMS");
              setOutreachModalOpen(true);
            }}
            onAssign={openAssignModal}
            onExport={handleBulkExport}
            onDelete={handleBulkDeleteClick}
            onClear={() => setSelectedLeads([])}
          />
        )
      }

  <LeadTable
  loading={loading}
  leads={leads}
  selectedLeads={selectedLeads}
  setSelectedLeads={setSelectedLeads}
  onView={handleViewLead}
  onAssign={handleSingleAssign}
  onFollowUp={(lead) => console.log("Follow Up", lead)}
  onDelete={handleDeleteClick}
/>

   <LeadPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.totalRecords}
        limit={pagination.limit}
        onPageChange={handlePageChange}
      />

<LeadAssignmentModal
  open={assignModal}
  mode={assignMode}
  lead={selectedLead}
  selectedLeads={selectedLeads}
  employees={employees}
  onClose={closeAssignModal}
  onAssign={handleAssign}
/>


<LeadDetailsDrawer
  open={drawerOpen}
  lead={selectedLead}
  onClose={handleCloseDrawer}
  onStatusUpdated={loadLeads}
  role="admin"
/>

<DeleteLeadModal
  open={deleteModalOpen}
  lead={selectedDeleteLead}
  isBulk={isBulkDelete}
  bulkCount={selectedLeads.length}
  loading={deleteLoading}
  onClose={handleCloseDeleteModal}
  onConfirm={handleDeleteLead}
/>

<CreateLeadModal
  open={createModalOpen}
  employees={employees}
  currentUserRole="ADMIN"
  onClose={() => setCreateModalOpen(false)}
  onSuccess={loadLeads}
/>

<ImportLeadsModal
  open={importModalOpen}
  employees={employees}
  onClose={() => setImportModalOpen(false)}
  onSuccess={loadLeads}
/>

<BulkOutreachModal
  open={outreachModalOpen}
  initialChannel={outreachChannel}
  leads={leads.filter((l) => selectedLeads.includes(l.id))}
  onClose={() => setOutreachModalOpen(false)}
  onSuccess={loadLeads}
  currentUser={user}
/>

    </div>

  );

};

export default LeadManagement;