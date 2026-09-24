import axiosInstance from "../api/axiosInstance";

// ===============================
// Get All Leads
// ===============================

export const getLeads = async (params = {}) => {

  const response = await axiosInstance.get("/leads", {
    params,
  });

  return response.data;

};

// ===============================
// Get Lead By Id
// ===============================

export const getLeadById = async (id) => {

  const response = await axiosInstance.get(`/leads/${id}`);

  return response.data;

};

// ===============================
// Get Lead Statistics
// ===============================

export const getLeadStats = async (params = {}) => {

  const response = await axiosInstance.get(
    "/leads/statistics",
    { params }
  );

  return response.data;

};

// ===============================
// Delete Lead
// ===============================

export const deleteLead = async (id) => {

  const response = await axiosInstance.delete(
    `/leads/${id}`
  );

  return response.data;

};

// ===============================
// Restore Lead
// ===============================

export const restoreLead = async (id) => {

  const response = await axiosInstance.patch(
    `/leads/${id}/restore`
  );

  return response.data;

};

// ===============================
// Update Lead Status
// ===============================
export const updateLeadStatus = async (leadId, data) => {
  const response = await axiosInstance.patch(
    `/leads/${leadId}/status`,
    data
  );

  return response.data;
};

// ===============================
// Create Lead (Manual Entry)
// ===============================
export const createLead = async (data) => {
  const response = await axiosInstance.post("/leads", data);
  return response.data;
};

// ===============================
// Bulk Delete Leads
// ===============================
export const deleteBulkLeads = async (leadIds) => {
  const response = await axiosInstance.post("/leads/bulk-delete", {
    lead_ids: leadIds,
  });
  return response.data;
};

// ===============================
// Import Historical Leads (CSV / Bulk)
// ===============================
export const importLeads = async (payload) => {
  const response = await axiosInstance.post("/leads/import", payload);
  return response.data;
};