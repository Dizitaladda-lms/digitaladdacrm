import axiosInstance from "../api/axiosInstance";

export const getMyEmployeeDocuments = async () => {
  const response = await axiosInstance.get("/employee/documents");
  return response.data;
};

export const uploadMyEmployeeDocument = async ({ file, documentType, documentLabel, documentNumber, documentDetails }) => {
  const body = new FormData();
  body.append("file", file);
  body.append("document_type", documentType);
  body.append("document_label", documentLabel || file.name);
  body.append("document_number", documentNumber || "");
  body.append("document_details", documentDetails || "");
  const response = await axiosInstance.post("/employee/documents", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getMyEmployeeDocumentAccessUrl = async (id) => {
  const response = await axiosInstance.get(`/employee/documents/${id}/access`);
  return response.data;
};

export const deleteMyEmployeeDocument = async (id) => {
  const response = await axiosInstance.delete(`/employee/documents/${id}`);
  return response.data;
};

export const getHREmployeeDocuments = async (params = {}) => {
  const response = await axiosInstance.get("/employees/documents", { params });
  return response.data;
};

export const getHREmployeeDocumentAccessUrl = async (id) => {
  const response = await axiosInstance.get(`/employees/documents/${id}/access`);
  return response.data;
};
