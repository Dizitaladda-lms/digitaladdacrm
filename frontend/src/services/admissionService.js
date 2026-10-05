import axiosInstance from "../api/axiosInstance";

/**
 * Fetch Admissions with filters & metrics
 */
export const getAdmissions = async (params = {}) => {
  const response = await axiosInstance.get("/admissions", { params });
  return response.data;
};

/**
 * Collect Fee Installment for an Admission (also aliased as addAdmissionPayment)
 */
export const collectFee = async (admissionId, payload) => {
  const response = await axiosInstance.patch(`/admissions/${admissionId}/fee`, payload);
  return response.data;
};

export const addAdmissionPayment = collectFee;

/**
 * Get Admission Details by ID
 */
export const getAdmissionDetails = async (admissionId) => {
  const response = await axiosInstance.get(`/admissions/${admissionId}`);
  return response.data;
};

/**
 * Get Admission Stats
 */
export const getAdmissionStats = async () => {
  const response = await axiosInstance.get("/admissions", { params: { limit: 1 } });
  return response.data?.summary || response.data?.data?.summary || {};
};

/**
 * Create a new Admission
 */
export const createAdmission = async (payload) => {
  const response = await axiosInstance.post("/admissions", payload);
  return response.data;
};

/**
 * Get Payment Receipt by ID
 */
export const getPaymentReceiptById = async (paymentId) => {
  const response = await axiosInstance.get(`/admissions/receipt/${paymentId}`);
  return response.data;
};


