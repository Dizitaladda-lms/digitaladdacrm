import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  createCourseService,
  createDomainService,
  createRoutingAssignmentService,
  getRoutingSetupService,
  removeRoutingAssignmentService,
  setEmployeeDomainsService,
} from "../services/leadRoutingService.js";

export const getRoutingSetup = asyncHandler(async (_req, res) => {
  const setup = await getRoutingSetupService();
  res.status(200).json(new ApiResponse(200, setup, "Lead routing setup fetched successfully."));
});

export const createDomain = asyncHandler(async (req, res) => {
  const domain = await createDomainService(req.body.name);
  res.status(201).json(new ApiResponse(201, domain, "Domain created successfully."));
});

export const createCourse = asyncHandler(async (req, res) => {
  const course = await createCourseService(req.body);
  res.status(201).json(new ApiResponse(201, course, "Course created successfully."));
});

export const createRoutingAssignment = asyncHandler(async (req, res) => {
  const assignment = await createRoutingAssignmentService(req.body);
  res.status(201).json(new ApiResponse(201, assignment, "Counsellor routing assignment created successfully."));
});

export const removeRoutingAssignment = asyncHandler(async (req, res) => {
  const assignment = await removeRoutingAssignmentService(req.params.id);
  res.status(200).json(new ApiResponse(200, assignment, "Counsellor routing assignment removed successfully."));
});

export const setEmployeeDomains = asyncHandler(async (req, res) => {
  const { employee_id, domain_ids, domain_names } = req.body;
  const targetId = req.params.id || employee_id;
  const result = await setEmployeeDomainsService({
    employee_id: targetId,
    domain_ids,
    domain_names,
  });
  res.status(200).json(new ApiResponse(200, result, "Employee domains updated successfully."));
});
