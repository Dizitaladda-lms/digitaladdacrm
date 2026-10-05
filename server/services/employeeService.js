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
    findEmployeeByCodeRepository,
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
    employee_code: employeeData.employee_code && typeof employeeData.employee_code === "string" && employeeData.employee_code.trim()
        ? employeeData.employee_code.trim().toUpperCase()
        : undefined,
});

const ensureEmployeeCanBeCreated = async (employeeData, isApproval = false, employeeId = null) => {
    if (!isValidRole(employeeData.role)) {
        throw new ApiError(400, "Invalid employee role.");
    }

    if (!isApproval) {
        // 1. Check if an active employee with this email exists
        const existingEmp = await findEmployeeByEmailRepository(employeeData.email);
        if (existingEmp && (!employeeId || existingEmp.id !== Number(employeeId))) {
            throw new ApiError(409, "An active employee with this email already exists.");
        }

        // 2. Check if a user with this email is currently linked to another active employee
        const existingUser = await findUserByEmailRepository(employeeData.email);
        if (existingUser) {
            const linkedEmp = await findEmployeeByUserIdRepository(existingUser.id);
            if (linkedEmp && (!employeeId || linkedEmp.id !== Number(employeeId))) {
                throw new ApiError(409, "This email is already in use by an active employee.");
            }
        }

        // 3. Check mobile number for active employees
        if (employeeData.mobile) {
            const existingMobile = await findEmployeeByMobileRepository(employeeData.mobile);
            if (existingMobile && (!employeeId || existingMobile.id !== Number(employeeId))) {
                throw new ApiError(409, "Mobile number already belongs to an existing employee.");
            }
        }

        // 4. Check custom Employee ID/Code if specified by HR
        if (employeeData.employee_code && typeof employeeData.employee_code === "string" && employeeData.employee_code.trim()) {
            const codeToTest = employeeData.employee_code.trim().toUpperCase();
            const existingCode = await findEmployeeByCodeRepository(codeToTest);
            if (existingCode && (!employeeId || existingCode.id !== Number(employeeId))) {
                throw new ApiError(409, `Employee ID/Code "${codeToTest}" is already in use.`);
            }
        }
    }
};

const createEmployeeWithinTransaction = async (
    client,
    employeeData,
    currentUser,
    req,
    passwordHash
) => {
    try {
        let user = await findUserByEmailRepository(employeeData.email);
        if (!user) {
            user = await createUserRepository(client, {
                full_name: employeeData.full_name,
                email: employeeData.email,
                password: passwordHash,
                role: employeeData.role,
            });
        } else {
            await updateUserRepository(client, user.id, {
                full_name: employeeData.full_name,
                password: passwordHash,
                role: employeeData.role,
            });
            await client.query(
                `UPDATE users SET is_deleted = FALSE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1;`,
                [user.id]
            );
        }

        // Determine employee code (custom from HR or auto-generated)
        let customCode = employeeData.employee_code && typeof employeeData.employee_code === "string" && employeeData.employee_code.trim()
            ? employeeData.employee_code.trim().toUpperCase()
            : null;

        // Check if an employee record already exists for this email (including soft-deleted rows)
        const existingEmpRes = await client.query(
            `SELECT id, employee_code, is_deleted FROM employees WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
            [employeeData.email]
        );
        let employee = existingEmpRes.rows[0] || null;

        if (!customCode) {
            if (employee?.employee_code) {
                customCode = employee.employee_code;
            } else {
                const sequence = await getNextEmployeeCodeRepository(client);
                customCode = generateEmployeeCode(sequence);
            }
        }

        if (employee) {
            const existingId = employee.id;
            await client.query(
                `UPDATE employees SET is_deleted = FALSE, status = 'ACTIVE', employee_code = $1, user_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3;`,
                [customCode, user.id, existingId]
            );
            const updated = await updateEmployeeRepository(client, existingId, {
                ...employeeData,
                employee_code: customCode,
                user_id: user.id,
                status: "ACTIVE",
                updated_by: currentUser?.id || null,
            });
            if (updated) {
                employee = updated;
            } else {
                const refetched = await client.query(`SELECT * FROM employees WHERE id = $1;`, [existingId]);
                employee = refetched.rows[0];
            }
        } else {
            employee = await createEmployeeRepository(client, {
                ...employeeData,
                user_id: user.id,
                employee_code: customCode,
                created_by: currentUser?.id || null,
            });
        }

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
            userId: currentUser?.id,
            role: currentUser?.role,
            entityId: employee?.id,
            requestId: req?.requestId,
            ip: req?.ip,
        });

        return employee;
    } catch (dbErr) {
        if (dbErr.code === "23505") {
            if (dbErr.constraint?.includes("mobile")) {
                throw new ApiError(409, "Mobile number already belongs to an existing employee.");
            }
            if (dbErr.constraint?.includes("email")) {
                throw new ApiError(409, "Email address already belongs to an existing employee.");
            }
            throw new ApiError(409, "Employee with this email or mobile number already exists.");
        }
        throw dbErr;
    }
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
        await ensureEmployeeCanBeCreated(employeeData, true);
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
        if (employeeData.email && employeeData.email !== employee.email) {
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

            const existingUser =
                await findUserByEmailRepository(
                    employeeData.email
                );

            if (
                existingUser &&
                existingUser.id !== employee.user_id
            ) {
                throw new ApiError(
                    409,
                    "A user account with this email already exists."
                );
            }
        }

        // Optional Password Hash
        let hashedPassword = null;
        if (employeeData.password && typeof employeeData.password === "string" && employeeData.password.trim() !== "") {
            const trimmedPassword = employeeData.password.trim();
            if (trimmedPassword.length < 6) {
                throw new ApiError(400, "Password must be at least 6 characters.");
            }
            hashedPassword = await bcrypt.hash(trimmedPassword, 10);
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

        // Employee ID / Code validation
        if (employeeData.employee_code && typeof employeeData.employee_code === "string" && employeeData.employee_code.trim()) {
            const formattedCode = employeeData.employee_code.trim().toUpperCase();
            if (formattedCode !== employee.employee_code) {
                const existingCode = await findEmployeeByCodeRepository(formattedCode);
                if (existingCode && existingCode.id !== Number(id)) {
                    throw new ApiError(409, `Employee ID/Code "${formattedCode}" is already in use by another employee.`);
                }
            }
            employeeData.employee_code = formattedCode;
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

        // Update Employee (employees table does not have a password column)
        const { password: _ignoredPassword, ...cleanEmployeeData } = employeeData;
        const updatedEmployee =
            await updateEmployeeRepository(
                client,
                id,
                {
                    ...cleanEmployeeData,
                    updated_by: currentUser.id,
                }
            );

        // Update User (Full Name, Role, Email, and Password)
        const userUpdatePayload = {
            full_name:
                employeeData.full_name ??
                employee.full_name,

            role:
                employeeData.role ??
                employee.role,
        };

        if (employeeData.email) {
            userUpdatePayload.email = employeeData.email;
        }

        if (hashedPassword) {
            userUpdatePayload.password = hashedPassword;
        }

        await updateUserRepository(
            client,
            employee.user_id,
            userUpdatePayload
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
