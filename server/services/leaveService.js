import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import ApiError from "../utils/ApiError.js";
import {
  createLeaveRequestRepository,
  decideLeaveRequestRepository,
  findDepartmentHeadRepository,
  findEmployeeLeaveDetailsRepository,
  getMyLeaveRequestsRepository,
  getPendingDepartmentHeadLeaveRequestsRepository,
  getPendingHRLeaveRequestsRepository,
  findLeaveApprovalProofForUserRepository,
  isDepartmentHeadRepository,
} from "../repositories/leaveRepository.js";

const isDepartmentHead = (user) => {
  const role = String(user?.employee_role || user?.role || "").toUpperCase();
  const designation = String(user?.designation || "").toLowerCase();
  return ["MANAGER", "ADMIN"].includes(role)
    || designation.includes("department head")
    || designation.includes("head of department");
};

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, "Screenshot storage is not configured. Contact HR.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
};

const uploadApprovalProof = (file, employeeId) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({
    public_id: `dizitaladda/leave-approval-proofs/${employeeId}/${crypto.randomUUID()}`,
    resource_type: "image",
    type: "authenticated",
    overwrite: false,
    context: { employee_id: String(employeeId), purpose: "leave_manager_approval" },
  }, (error, result) => (error ? reject(error) : resolve(result)));
  stream.end(file.buffer);
});

export const createLeaveRequestService = async (payload, user, approvalProofFile) => {
  const leaveType = String(payload?.leave_type || "").toUpperCase();
  const startDate = String(payload?.start_date || "");
  const endDate = String(payload?.end_date || "");
  const reason = String(payload?.reason || "").trim();
  if (!["PLANNED", "URGENT"].includes(leaveType)) {
    throw new ApiError(400, "Choose planned or urgent leave.");
  }
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ApiError(400, "Enter a valid leave start and end date.");
  }
  if (endDate < startDate) {
    throw new ApiError(400, "The leave end date cannot be before the start date.");
  }
  if (leaveType === "PLANNED" && startDate <= new Date().toISOString().slice(0, 10)) {
    throw new ApiError(400, "Planned leave must start on a future date.");
  }
  if (reason.length < 3 || reason.length > 2000) {
    throw new ApiError(400, "Please provide a reason between 3 and 2000 characters.");
  }

  const employee = await findEmployeeLeaveDetailsRepository(user.id);
  if (!employee) {
    throw new ApiError(400, "An active employee profile is required to raise a leave request.");
  }
  if (!employee.department_id) {
    throw new ApiError(400, "Your employee profile must have a department before raising leave.");
  }

  if (leaveType === "PLANNED") {
    const departmentHead = await findDepartmentHeadRepository(employee.department_id, user.id);
    if (!departmentHead) {
      throw new ApiError(409, "No department head is configured for your department. Contact HR.");
    }
  }

  let uploadedProof;
  if (approvalProofFile) {
    configureCloudinary();
    try {
      uploadedProof = await uploadApprovalProof(approvalProofFile, employee.id);
    } catch (error) {
      console.error("Leave approval screenshot upload failed", { message: error?.message, http_code: error?.http_code });
      if ([401, 403].includes(Number(error?.http_code))) {
        throw new ApiError(503, "Screenshot storage credentials were rejected. Contact HR.");
      }
      throw new ApiError(502, "Approval screenshot upload failed. Please try again.");
    }
  }

  try {
    return await createLeaveRequestRepository({
      userId: user.id,
      employeeId: employee.id,
      departmentId: employee.department_id,
      leaveType,
      startDate,
      endDate,
      reason,
      status: leaveType === "PLANNED" ? "PENDING_DEPARTMENT_HEAD" : "PENDING_HR_APPROVAL",
      managerApprovalProof: uploadedProof && {
        publicId: uploadedProof.public_id,
        resourceType: uploadedProof.resource_type || "image",
        version: uploadedProof.version ? String(uploadedProof.version) : null,
        filename: approvalProofFile.originalname.slice(0, 255),
        mimeType: approvalProofFile.mimetype,
        sizeBytes: approvalProofFile.size,
      },
    });
  } catch (error) {
    if (uploadedProof?.public_id) {
      await cloudinary.uploader.destroy(uploadedProof.public_id, { resource_type: "image", type: "authenticated", invalidate: true }).catch(() => {});
    }
    throw error;
  }
};

export const getMyLeaveRequestsService = (user) => getMyLeaveRequestsRepository(user.id);

export const getLeaveApprovalProofService = async (id, user) => {
  if (!/^\d+$/.test(String(id))) throw new ApiError(400, "A valid leave request ID is required.");
  const proof = await findLeaveApprovalProofForUserRepository(Number(id), user);
  if (!proof) throw new ApiError(404, "Approval screenshot was not found or you do not have access.");
  configureCloudinary();
  return {
    access_url: cloudinary.url(proof.manager_approval_proof_public_id, {
      resource_type: proof.manager_approval_proof_resource_type || "image",
      type: "authenticated",
      sign_url: true,
      secure: true,
      version: proof.manager_approval_proof_version || undefined,
    }),
    original_filename: proof.manager_approval_proof_filename,
    mime_type: proof.manager_approval_proof_mime_type,
  };
};

export const getPendingLeaveApprovalsService = async (user) => {
  const role = String(user?.role || "").toUpperCase();
  if (["HR", "SUPER_ADMIN"].includes(role)) {
    return getPendingHRLeaveRequestsRepository();
  }
  if (
    isDepartmentHead(user)
    || await isDepartmentHeadRepository(user.id)
  ) {
    return getPendingDepartmentHeadLeaveRequestsRepository(user.id);
  }
  return [];
};

export const decideLeaveRequestService = async (id, payload, user) => {
  const decision = String(payload?.decision || "").toUpperCase();
  const reason = String(payload?.reason || "").trim();
  if (!/^\d+$/.test(String(id))) {
    throw new ApiError(400, "A valid leave request ID is required.");
  }
  if (!["APPROVE", "REJECT"].includes(decision)) {
    throw new ApiError(400, "Choose approve or reject.");
  }
  if (decision === "REJECT" && reason.length > 2000) {
    throw new ApiError(400, "Rejection reason cannot exceed 2000 characters.");
  }

  const result = await decideLeaveRequestRepository({
    id: Number(id),
    user,
    decision,
    reason: reason || null,
  });
  if (!result) throw new ApiError(404, "Leave request not found.");
  if (result.forbidden) throw new ApiError(403, "You are not authorized to review this leave request.");
  if (result.conflict) throw new ApiError(409, "This leave request has already been reviewed.");
  return result;
};
