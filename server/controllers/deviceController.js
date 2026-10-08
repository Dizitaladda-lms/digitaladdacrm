import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  getEmployeeDeviceOverviewService,
  renameEmployeeDeviceService,
  revokeEmployeeDeviceService,
} from "../services/deviceService.js";
import { DEVICE_ID_PATTERN } from "../utils/deviceBinding.js";
import ApiError from "../utils/ApiError.js";

const parseDeviceId = (value) => {
  if (!DEVICE_ID_PATTERN.test(String(value || ""))) {
    throw new ApiError(400, "Invalid device id.");
  }
  return value.toLowerCase();
};

export const getEmployeeDeviceOverviewController = asyncHandler(async (req, res) => {
  const overview = await getEmployeeDeviceOverviewService(req.params.id);
  return res.status(200).json(new ApiResponse(200, overview, "Employee devices retrieved."));
});

export const revokeEmployeeDeviceController = asyncHandler(async (req, res) => {
  const result = await revokeEmployeeDeviceService(
    req.params.id,
    parseDeviceId(req.params.deviceId),
    req.user,
    req.ip
  );
  return res.status(200).json(new ApiResponse(200, result, result.message));
});

export const renameEmployeeDeviceController = asyncHandler(async (req, res) => {
  const deviceName = String(req.body?.device_name || "").trim();
  if (!deviceName || deviceName.length > 120) {
    throw new ApiError(400, "Device name must be between 1 and 120 characters.");
  }
  const result = await renameEmployeeDeviceService(
    req.params.id,
    parseDeviceId(req.params.deviceId),
    deviceName,
    req.user,
    req.ip
  );
  return res.status(200).json(new ApiResponse(200, result, "Device renamed."));
});
