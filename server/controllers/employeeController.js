import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
    createEmployeeService,
    getAllEmployeesService,
    getActiveCounsellorsForLeadAssignmentService,
    getEmployeeByIdService,
    updateEmployeeService,
    deleteEmployeeService,
    restoreEmployeeService,
    getEmployeeStatisticsService,
    getEmployeePerformanceService,
    listPendingEmployeeApprovalRequestsService,
    approveEmployeeApprovalRequestService,
    rejectEmployeeApprovalRequestService,
} from "../services/employeeService.js";
import { getMyLeadsService } from "../services/employeeService.js";
/**
 * =====================================================
 * Create Employee
 * =====================================================
 */

export const createEmployeeController = asyncHandler(
    async (req, res) => {

        const employee =
            await createEmployeeService(
                req.body,
                req.user,
                req
            );

        return res.status(201).json(

            new ApiResponse(
                201,
                employee,
                "Employee created successfully."
            )

        );

    }
);

/**
 * =====================================================
 * Get All Employees
 * =====================================================
 */

export const getAllEmployeesController = asyncHandler(
    async (req, res) => {

        const employees =
            await getAllEmployeesService(
                req.query
            );

        return res.status(200).json(

            new ApiResponse(
                200,
                employees,
                "Employees fetched successfully."
            )

        );

    }
);

export const getLeadAssigneesController = asyncHandler(async (_req, res) => {
    const employees = await getActiveCounsellorsForLeadAssignmentService();

    return res.status(200).json(
        new ApiResponse(200, { employees }, "Active counsellors fetched successfully.")
    );
});

export const getEmployeeApprovalRequestsController = asyncHandler(async (_req, res) => {
    const requests = await listPendingEmployeeApprovalRequestsService();
    return res.status(200).json(
        new ApiResponse(200, requests, "Pending employee approval requests retrieved.")
    );
});

export const approveEmployeeApprovalRequestController = asyncHandler(async (req, res) => {
    const employee = await approveEmployeeApprovalRequestService(
        req.params.id,
        req.user,
        req
    );
    return res.status(200).json(
        new ApiResponse(200, employee, "Employee request approved and account created.")
    );
});

export const rejectEmployeeApprovalRequestController = asyncHandler(async (req, res) => {
    const result = await rejectEmployeeApprovalRequestService(
        req.params.id,
        req.user,
        String(req.body?.review_note || "").slice(0, 500)
    );
    return res.status(200).json(
        new ApiResponse(200, result, "Employee request rejected.")
    );
});

/**
 * =====================================================
 * Get Employee By ID
 * @route GET /api/employees/:id
 * =====================================================
 */

export const getEmployeeByIdController = asyncHandler(

    async (req, res) => {

        const employee =
            await getEmployeeByIdService(

                req.params.id,
                req.user

            );

        return res.status(200).json(

            new ApiResponse(

                200,

                employee,

                "Employee fetched successfully."

            )

        );

    }

);

/**
 * =====================================================
 * Update Employee
 * @route PUT /api/employees/:id
 * =====================================================
 */

export const updateEmployeeController = asyncHandler(

    async (req, res) => {

        const updatedEmployee =
            await updateEmployeeService(

                req.params.id,

                req.body,

                req.user,

                {
                    requestId: req.requestId,
                    ip: req.ip
                }

            );

        return res.status(200).json(

            new ApiResponse(

                200,

                updatedEmployee,

                "Employee updated successfully."

            )

        );

    }

);


/**
 * =====================================================
 * Delete Employee
 * @route DELETE /api/employees/:id
 * =====================================================
 */

export const deleteEmployeeController = asyncHandler(

    async (req, res) => {

        const employee =
            await deleteEmployeeService(

                req.params.id,

                req.user,

                {
                    requestId: req.requestId,
                    ip: req.ip
                }

            );

        return res.status(200).json(

            new ApiResponse(

                200,

                employee,

                "Employee deleted successfully."

            )

        );

    }

);

/**
 * =====================================================
 * Restore Employee
 * @route PATCH /api/employees/:id/restore
 * =====================================================
 */

export const restoreEmployeeController = asyncHandler(

    async (req, res) => {

        const employee =
            await restoreEmployeeService(

                req.params.id,

                req.user,

                {
                    requestId: req.requestId,
                    ip: req.ip
                }

            );

        return res.status(200).json(

            new ApiResponse(

                200,

                employee,

                "Employee restored successfully."

            )

        );

    }

);

/**
 * =====================================================
 * Employee Statistics
 * @route GET /api/employees/statistics
 * =====================================================
 */

export const getEmployeeStatisticsController = asyncHandler(

    async (req, res) => {

        const statistics =
            await getEmployeeStatisticsService();

        return res.status(200).json(

            new ApiResponse(

                200,

                statistics,

                "Employee statistics fetched successfully."

            )

        );

    }

);

export const getEmployeePerformanceController = asyncHandler(async (req, res) => {
    const timeframe = req.query.timeframe || "all";
    const performance = await getEmployeePerformanceService(req.params.id, null, timeframe, req.query.date_from || null, req.query.date_to || null);
    return res.status(200).json(new ApiResponse(200, performance, "Employee performance fetched successfully."));
});

export const getMyPerformanceController = asyncHandler(async (req, res) => {
    const timeframe = req.query.timeframe || "all";
    const performance = await getEmployeePerformanceService(null, req.user.id, timeframe, req.query.date_from || null, req.query.date_to || null);
    return res.status(200).json(new ApiResponse(200, performance, "My performance scorecards fetched successfully."));
});


/**
 * =====================================================
 * Get My Leads Controller
 * =====================================================
 */

export const getMyLeadsController = async (
  req,
  res,
  next
) => {

  try {

    const filters = {

      page: req.query.page,

      limit: req.query.limit,

      search: req.query.search,

      status: req.query.status,

      priority: req.query.priority,

      domain: req.query.domain,

      source: req.query.source,

      date_from: req.query.date_from,

      date_to: req.query.date_to,

      sortBy: req.query.sortBy,

      order: req.query.order,

    };

    const data = await getMyLeadsService(

      req.user.id,

      filters

    );

    return res.status(200).json({

      success: true,

      statusCode: 200,

      message: "My leads fetched successfully.",

      data,

    });

  } catch (error) {

    next(error);

  }

};
