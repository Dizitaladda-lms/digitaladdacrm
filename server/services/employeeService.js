import { withTransaction } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import auditLogger from "../utils/auditLogger.js";
import { isValidRole } from "../constants/roles.js";
import bcrypt from "bcryptjs";

import {
    createUserRepository,
    findUserByEmailRepository,
    updateUserRepository,
    softDeleteUserRepository,
    restoreUserRepository,
} from "../repositories/userRepository.js";

import {
    getNextEmployeeCodeRepository,
    createEmployeeRepository,
    findEmployeeByIdRepository,
    findEmployeeByEmailRepository,
    findEmployeeByMobileRepository,
    updateEmployeeRepository,
    deleteEmployeeRepository,
    restoreEmployeeRepository,
    getEmployeesRepository,
    getEmployeeStatisticsRepository,
    getEmployeePerformanceRepository,
    findEmployeeByUserIdRepository,
} from "../repositories/employeeRepository.js";

import { getMyLeadsRepository } from "../repositories/leadRepository.js";
import { createRoutingAssignmentRepository } from "../repositories/leadRoutingRepository.js";
import {
    createEmployeeApprovalRequestRepository,
    findEmployeeApprovalRequestForUpdateRepository,
    listPendingEmployeeApprovalRequestsRepository,
    reviewEmployeeApprovalRequestRepository,
} from "../repositories/employeeApprovalRepository.js";
import { ensureEmployeeProfileForUser } from "./ensureEmployeeProfile.service.js";

const generateEmployeeCode = (sequence) => {
    const prefix = process.env.EMPLOYEE_CODE_PREFIX || "EMP";
    return `${prefix}${String(sequence).padStart(6, "0")}`;
};

const safeAuditLog = (payload) => {
    try {
        auditLogger(payload);
    } catch (error) {
        console.error("Audit Logger Error:", error.message);
    }
};

const normalizeEmployeeData = (employeeData) => ({
    ...employeeData,
    email: employeeData.email.trim().toLowerCase(),
    full_name: employeeData.full_name.trim(),
    mobile: employeeData.mobile.trim(),
});

const ensureEmployeeCanBeCreated = async (employeeData) => {
    if (!isValidRole(employeeData.role)) {
        throw new ApiError(400, "Invalid employee role.");
    }

    if (await findEmployeeByEmailRepository(employeeData.email)) {
        throw new ApiError(409, "Employee email already exists.");
    }

    if (await findUserByEmailRepository(employeeData.email)) {
        throw new ApiError(409, "User email already exists.");
    }

    if (await findEmployeeByMobileRepository(employeeData.mobile)) {
        throw new ApiError(409, "Mobile number already exists.");
    }
};

const createEmployeeWithinTransaction = async (
    client,
    employeeData,
    currentUser,
    req,
    passwordHash
) => {
    const sequence = await getNextEmployeeCodeRepository(client);
    const employeeCode = generateEmployeeCode(sequence);
    const user = await createUserRepository(client, {
        full_name: employeeData.full_name,
        email: employeeData.email,
        password: passwordHash,
        role: employeeData.role,
    });
    const employee = await createEmployeeRepository(client, {
        ...employeeData,
        user_id: user.id,
        employee_code: employeeCode,
        created_by: currentUser.id,
    });

    if (Array.isArray(employeeData.routing_assignments)) {
        for (const routing of employeeData.routing_assignments) {
            if (!routing?.domain_id) continue;
            await createRoutingAssignmentRepository(client, {
                employeeId: employee.id,
                domainId: routing.domain_id,
                courseId: routing.course_id || null,
                autoAssign: routing.auto_assign !== false,
            });
        }
    }

    safeAuditLog({
        action: "EMPLOYEE_CREATED",
        module: "EMPLOYEE",
        userId: currentUser.id,
        role: currentUser.role,
        entityId: employee.id,
        requestId: req.requestId,
        ip: req.ip,
    });

    return employee;
};

const getEmployeePasswordHash = async (employeeData) => {
    const temporaryPassword = employeeData.password || process.env.DEFAULT_EMPLOYEE_PASSWORD;

    if (
        process.env.NODE_ENV === "production" &&
        !employeeData.password &&
        process.env.ALLOW_DEFAULT_EMPLOYEE_PASSWORD !== "true"
    ) {
        throw new ApiError(400, "A temporary password is required when creating an employee.");
    }

    if (!temporaryPassword) {
        throw new ApiError(400, "A temporary password is required when creating an employee.");
    }

    return bcrypt.hash(temporaryPassword, 10);
};

const createEmployeeApprovalRequest = async (employeeData, currentUser) => {
    await ensureEmployeeCanBeCreated(employeeData);
    const passwordHash = await getEmployeePasswordHash(employeeData);
    const { password, ...requestData } = employeeData;

    try {
        const request = await withTransaction((client) =>
            createEmployeeApprovalRequestRepository(
                client,
                currentUser.id,
                requestData,
                passwordHash
            )
        );
        return { approvalRequired: true, request };
    } catch (error) {
        if (error.code === "23505") {
            throw new ApiError(409, "An employee request for this email is already pending.");
        }
        throw error;
    }
};

export const createEmployeeService = async (employeeData, currentUser, req) => {
    const normalizedData = normalizeEmployeeData(employeeData);

    if (String(currentUser.role || "").toUpperCase() === "HR") {
        return createEmployeeApprovalRequest(normalizedData, currentUser);
    }

    await ensureEmployeeCanBeCreated(normalizedData);
    const passwordHash = await getEmployeePasswordHash(normalizedData);
    return withTransaction((client) =>
        createEmployeeWithinTransaction(client, normalizedData, currentUser, req, passwordHash)
    );
};

export const listPendingEmployeeApprovalRequestsService = async () =>
    listPendingEmployeeApprovalRequestsRepository();

export const approveEmployeeApprovalRequestService = async (id, currentUser, req) =>
    withTransaction(async (client) => {
        const request = await findEmployeeApprovalRequestForUpdateRepository(client, id);
        if (!request) throw new ApiError(404, "Employee approval request not found.");
        if (request.status !== "PENDING") {
            throw new ApiError(409, "This employee request has already been reviewed.");
        }

        const employeeData = request.employee_data;
        await ensureEmployeeCanBeCreated(employeeData);
        const employee = await createEmployeeWithinTransaction(
            client,
            employeeData,
            currentUser,
            req,
            request.password_hash
        );
        await reviewEmployeeApprovalRequestRepository(
            client,
            id,
            currentUser.id,
            "APPROVED"
        );

        return employee;
    });

export const rejectEmployeeApprovalRequestService = async (id, currentUser, reviewNote) =>
    withTransaction(async (client) => {
        const request = await findEmployeeApprovalRequestForUpdateRepository(client, id);
        if (!request) throw new ApiError(404, "Employee approval request not found.");
        if (request.status !== "PENDING") {
            throw new ApiError(409, "This employee request has already been reviewed.");
        }

        return reviewEmployeeApprovalRequestRepository(
            client,
            id,
            currentUser.id,
            "REJECTED",
            reviewNote || null
        );
    });

/* =====================================================
 * Update Employee
 * ===================================================== */

export const updateEmployeeService = async (
    id,
    employeeData,
    currentUser,
    req
) => {

    // Normalize Data
    if (employeeData.email) {
        employeeData.email =
            employeeData.email.trim().toLowerCase();
    }

    if (employeeData.full_name) {
        employeeData.full_name =
            employeeData.full_name.trim();
    }

    if (employeeData.mobile) {
        employeeData.mobile =
            employeeData.mobile.trim();
    }

    return await withTransaction(async (client) => {

        // Employee Exists
        const employee =
            await findEmployeeByIdRepository(id);

        if (!employee) {
            throw new ApiError(
                404,
                "Employee not found."
            );
        }

        // Duplicate Email Check
        if (employeeData.email) {

            const existingEmail =
                await findEmployeeByEmailRepository(
                    employeeData.email
                );

            if (
                existingEmail &&
                existingEmail.id !== Number(id)
            ) {
                throw new ApiError(
                    409,
                    "Employee email already exists."
                );
            }
        }

        // Duplicate Mobile Check
        if (employeeData.mobile) {

            const existingMobile =
                await findEmployeeByMobileRepository(
                    employeeData.mobile
                );

            if (
                existingMobile &&
                existingMobile.id !== Number(id)
            ) {
                throw new ApiError(
                    409,
                    "Mobile number already exists."
                );
            }
        }

        // Role Validation
        if (
            employeeData.role &&
            !isValidRole(employeeData.role)
        ) {
            throw new ApiError(
                400,
                "Invalid employee role."
            );
        }

        const currentRole = String(currentUser.role || "").toUpperCase();
        const requestedRole = String(employeeData.role || "").toUpperCase();
        const existingRole = String(employee.role || "").toUpperCase();
        if (
            currentRole === "HR" &&
            requestedRole !== existingRole &&
            ["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(requestedRole)
        ) {
            throw new ApiError(403, "HR cannot grant Manager or Super Admin access.");
        }

        // Update Employee
        const updatedEmployee =
            await updateEmployeeRepository(
                client,
                id,
                {
                    ...employeeData,
                    updated_by: currentUser.id,
                }
            );

        // Update User
        await updateUserRepository(
            client,
            employee.user_id,
            {
                full_name:
                    employeeData.full_name ??
                    employee.full_name,

                role:
                    employeeData.role ??
                    employee.role,
            }
        );

        safeAuditLog({
            action: "EMPLOYEE_UPDATED",
            module: "EMPLOYEE",
            userId: currentUser.id,
            role: currentUser.role,
            entityId: id,
            requestId: req.requestId,
            ip: req.ip,
        });

        return updatedEmployee;

    });

};

/* =====================================================
 * Delete Employee
 * ===================================================== */

export const deleteEmployeeService = async (
    id,
    currentUser,
    req
) => {

    return await withTransaction(async (client) => {

        const employee =
            await findEmployeeByIdRepository(id);

        if (!employee) {

            throw new ApiError(
                404,
                "Employee not found."
            );

        }

        const deletedEmployee =
            await deleteEmployeeRepository(
                client,
                id,
                currentUser.id
            );

        await softDeleteUserRepository(
            client,
            employee.user_id
        );

        safeAuditLog({
            action: "EMPLOYEE_DELETED",
            module: "EMPLOYEE",
            userId: currentUser.id,
            role: currentUser.role,
            entityId: id,
            requestId: req.requestId,
            ip: req.ip,
        });

        return deletedEmployee;

    });

};

/* =====================================================
 * Restore Employee
 * ===================================================== */

export const restoreEmployeeService = async (
    id,
    currentUser,
    req
) => {

    return await withTransaction(async (client) => {

        const employee =
            await restoreEmployeeRepository(
                client,
                id,
                currentUser.id
            );

        // FIXED BUG
        if (!employee) {

            throw new ApiError(
                404,
                "Employee not found."
            );

        }

        await restoreUserRepository(
            client,
            employee.user_id
        );

        safeAuditLog({
            action: "EMPLOYEE_RESTORED",
            module: "EMPLOYEE",
            userId: currentUser.id,
            role: currentUser.role,
            entityId: id,
            requestId: req.requestId,
            ip: req.ip,
        });

        return employee;

    });

};

/**
 * =====================================================
 * Get All Employees
 * =====================================================
 */

export const getAllEmployeesService = async (filters = {}) => {

    return await getEmployeesRepository(filters);

};

/**
 * =====================================================
 * Get Employee By ID
 * =====================================================
 */

export const getEmployeeByIdService = async (
    id,
    currentUser
) => {

    const employee =
        await findEmployeeByIdRepository(id);

    if (!employee) {

        throw new ApiError(
            404,
            "Employee not found."
        );

    }

    // COUNSELLOR can only view their own profile
    if (
        currentUser.role === "COUNSELLOR" &&
        employee.user_id !== currentUser.id
    ) {

        throw new ApiError(
            403,
            "You are not authorized to view this employee."
        );

    }

    return employee;

};

/**
 * =====================================================
 * Get Employee Statistics
 * =====================================================
 */

export const getEmployeeStatisticsService = async () => {

    return await getEmployeeStatisticsRepository();

};

/**

    return await getEmployeeStatisticsRepository();

};

/**
 * =====================================================
 * Get My Leads Service
 * =====================================================
 */

export const getMyLeadsService = async (
  userId,
  filters
) => {
  const employee = await ensureEmployeeProfileForUser(userId);

  if (!employee) {
    return {
      leads: [],
      pagination: {
        page: Number(filters?.page || 1),
        limit: Number(filters?.limit || 10),
        totalRecords: 0,
        totalPages: 1,
      },
    };
  }

  return await getMyLeadsRepository({
    employeeId: employee.id,
    ...filters,
  });
};

export const getEmployeePerformanceService = async (id, userId = null, timeframe = "all", dateFrom = null, dateTo = null) => {
    let employeeId = id;
    if (!employeeId && userId) {
        const emp = await ensureEmployeeProfileForUser(userId);
        if (!emp) throw new ApiError(404, "Employee profile not found.");
        employeeId = emp.id;
    }
    const employee = await findEmployeeByIdRepository(employeeId);
    if (!employee) throw new ApiError(404, "Employee not found.");
    const perfData = await getEmployeePerformanceRepository(employeeId, timeframe, dateFrom, dateTo);
    return { employee, ...perfData };
};
