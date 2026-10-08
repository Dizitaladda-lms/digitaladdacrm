import { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import {
  findEmployeeUserIdRepository,
  insertDeviceAdminAuditLogRepository,
  listEmployeeBlockedAttemptsRepository,
  listEmployeeDevicesRepository,
} from "../repositories/deviceRepository.js";
import { revokeDeviceRefreshTokensRepository } from "../repositories/refreshTokenRepository.js";

const auditAdminAction = async (client, admin, employeeUserId, action, deviceId, details, ipAddress) => {
  await insertDeviceAdminAuditLogRepository(client, {
    adminUserId: admin.id,
    employeeUserId,
    action,
    deviceId,
    details,
    ipAddress,
  });
};

export const getEmployeeDeviceOverviewService = async (employeeId) => {
  const [devices, blockedAttempts] = await Promise.all([
    listEmployeeDevicesRepository(employeeId),
    listEmployeeBlockedAttemptsRepository(employeeId),
  ]);
  return { devices, blockedAttempts };
};

export const revokeEmployeeDeviceService = async (
  employeeId,
  deviceId,
  admin,
  ipAddress
) => withTransaction(async (client) => {
  const userId = await findEmployeeUserIdRepository(client, employeeId);
  if (!userId) throw new ApiError(404, "Employee not found.");

  const { rows } = await client.query(
    `UPDATE user_devices
     SET status = 'revoked', revoked_by = $3, revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND device_id = $2 AND status = 'approved'
     RETURNING device_type, device_name;`,
    [userId, deviceId, admin.id]
  );
  if (!rows[0]) throw new ApiError(404, "Approved device not found.");

  await revokeDeviceRefreshTokensRepository(client, userId, deviceId);
  await auditAdminAction(
    client,
    admin,
    userId,
    "DEVICE_REVOKED",
    deviceId,
    { deviceType: rows[0].device_type, deviceName: rows[0].device_name },
    ipAddress
  );
  return { success: true, message: "Device revoked; its slot is now available." };
});

export const renameEmployeeDeviceService = async (
  employeeId,
  deviceId,
  deviceName,
  admin,
  ipAddress
) => withTransaction(async (client) => {
  const userId = await findEmployeeUserIdRepository(client, employeeId);
  if (!userId) throw new ApiError(404, "Employee not found.");

  const { rows } = await client.query(
    `UPDATE user_devices
     SET device_name = $3
     WHERE user_id = $1 AND device_id = $2
     RETURNING status;`,
    [userId, deviceId, deviceName.trim().slice(0, 120)]
  );
  if (!rows[0]) throw new ApiError(404, "Device not found.");

  await auditAdminAction(
    client,
    admin,
    userId,
    "DEVICE_RENAMED",
    deviceId,
    { deviceName: deviceName.trim().slice(0, 120), status: rows[0].status },
    ipAddress
  );
  return { success: true };
});
