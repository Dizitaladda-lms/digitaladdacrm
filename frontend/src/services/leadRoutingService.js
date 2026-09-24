import axiosInstance from "../api/axiosInstance";

export const getLeadRoutingSetup = async () => (await axiosInstance.get("/lead-routing")).data;
export const createDomainCourse = async (payload) => (await axiosInstance.post("/lead-routing/courses", payload)).data;
export const createRoutingAssignment = async (payload) => (await axiosInstance.post("/lead-routing/assignments", payload)).data;
export const setEmployeeDomains = async (employeeId, payload) =>
  (await axiosInstance.put(`/lead-routing/employee/${employeeId}/domains`, payload)).data;
