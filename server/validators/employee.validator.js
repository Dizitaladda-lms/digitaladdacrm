import Joi from "joi";
import ApiError from "../utils/ApiError.js";

/**
 * =====================================================
 * Employee Create Schema
 * =====================================================
 */

const createEmployeeSchema = Joi.object({

    full_name: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.empty": "Full name is required.",
            "string.min": "Full name must be at least 3 characters.",
            "string.max": "Full name cannot exceed 100 characters.",
            "any.required": "Full name is required.",
        }),

    employee_code: Joi.string()
        .trim()
        .max(50)
        .allow("", null)
        .optional()
        .messages({
            "string.max": "Employee code cannot exceed 50 characters.",
        }),

    email: Joi.string()
        .trim()
        .email()
        .lowercase()
        .required()
        .messages({
            "string.email": "Please enter a valid email address.",
            "string.empty": "Email is required.",
            "any.required": "Email is required.",
        }),

    mobile: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .required()
        .messages({
            "string.pattern.base": "Please enter a valid mobile number.",
            "string.empty": "Mobile number is required.",
            "any.required": "Mobile number is required.",
        }),

    department_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "Department is required.",
            "any.required": "Department is required.",
        }),

    designation: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            "string.empty": "Designation is required.",
            "any.required": "Designation is required.",
        }),

    role: Joi.string()
        .valid("MANAGER", "ADMIN", "SUPER_ADMIN", "COUNSELLOR", "HR", "TL", "TRAINER", "EMPLOYEE", "INTERN")
        .required()
        .messages({
            "any.only": "Invalid employee role.",
            "any.required": "Role is required.",
        }),

    employment_type: Joi.string()
        .valid(
            "FULL_TIME",
            "PART_TIME",
            "CONTRACT",
            "INTERN"
        )
        .optional(),

    status: Joi.string()
        .valid(
            "ACTIVE",
            "INACTIVE",
            "ON_LEAVE",
            "SUSPENDED"
        )
        .optional(),

    joining_date: Joi.date()
        .optional(),

    date_of_birth: Joi.date()
        .optional(),

    gender: Joi.string()
        .valid(
            "MALE",
            "FEMALE",
            "OTHER"
        )
        .optional(),

    address: Joi.string()
        .trim()
        .max(500)
        .optional(),

    emergency_contact_name: Joi.string()
        .trim()
        .max(100)
        .optional(),

    emergency_contact: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .optional(),

    password: Joi.string()
        .min(8)
        .max(50)
        .optional(),

    routing_assignments: Joi.array().items(
        Joi.object({
            domain_id: Joi.number().integer().positive().required(),
            course_id: Joi.number().integer().positive().allow(null).optional(),
            auto_assign: Joi.boolean().optional(),
        })
    ).optional(),

}).options({

    abortEarly: false,

    stripUnknown: true,

});

/**
 * =====================================================
 * Validate Create Employee
 * =====================================================
 */

export const validateCreateEmployee = (
    req,
    res,
    next
) => {

    const { error, value } =
        createEmployeeSchema.validate(
            req.body
        );

    if (error) {

        const message =
            error.details
                .map(item => item.message)
                .join(", ");

        return next(
            new ApiError(
                400,
                message
            )
        );

    }

    req.body = value;

    next();

};

/**
 * =====================================================
 * Employee Update Schema
 * =====================================================
 */

const updateEmployeeSchema = Joi.object({

    full_name: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .optional()
        .messages({
            "string.min": "Full name must be at least 3 characters.",
            "string.max": "Full name cannot exceed 100 characters.",
        }),

    employee_code: Joi.string()
        .trim()
        .max(50)
        .allow("", null)
        .optional()
        .messages({
            "string.max": "Employee code cannot exceed 50 characters.",
        }),

    email: Joi.string()
        .trim()
        .email()
        .lowercase()
        .optional()
        .messages({
            "string.email": "Please enter a valid email address.",
        }),

    password: Joi.string()
        .min(6)
        .max(100)
        .allow("", null)
        .optional()
        .messages({
            "string.min": "Password must be at least 6 characters.",
            "string.max": "Password cannot exceed 100 characters.",
        }),

    mobile: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .optional()
        .messages({
            "string.pattern.base": "Please enter a valid mobile number.",
        }),

    department_id: Joi.number()
        .integer()
        .positive()
        .optional(),

    designation: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    role: Joi.string()
        .valid(
            "MANAGER", "ADMIN", "SUPER_ADMIN", "COUNSELLOR", "HR", "TL", "TRAINER", "EMPLOYEE", "INTERN",
            "COUNSELLOR"
        )
        .optional()
        .messages({
            "any.only": "Invalid employee role.",
        }),

    employment_type: Joi.string()
        .valid(
            "FULL_TIME",
            "PART_TIME",
            "CONTRACT",
            "INTERN"
        )
        .optional(),

    status: Joi.string()
        .valid(
            "ACTIVE",
            "INACTIVE",
            "ON_LEAVE",
            "SUSPENDED"
        )
        .optional(),

    joining_date: Joi.date()
        .optional(),

    date_of_birth: Joi.date()
        .optional(),

    gender: Joi.string()
        .valid(
            "MALE",
            "FEMALE",
            "OTHER"
        )
        .optional(),

    address: Joi.string()
        .trim()
        .max(500)
        .optional(),

    emergency_contact_name: Joi.string()
        .trim()
        .max(100)
        .optional(),

    reporting_manager_id: Joi.number()
        .integer()
        .positive()
        .allow(null, "")
        .optional(),

    lead_overview_read_only: Joi.boolean()
        .optional(),

    emergency_contact: Joi.string()
        .trim()
        .pattern(/^[6-9]\d{9}$/)
        .allow(null, "")
        .optional(),

}).min(1).options({

    abortEarly: false,

    stripUnknown: true,

});

/**
 * =====================================================
 * Validate Update Employee
 * =====================================================
 */

export const validateUpdateEmployee = (

    req,

    res,

    next

) => {

    const { error, value } =

        updateEmployeeSchema.validate(

            req.body

        );

    if (error) {

        const message =

            error.details

                .map(item => item.message)

                .join(", ");

        return next(

            new ApiError(

                400,

                message

            )

        );

    }

    req.body = value;

    next();

};

/**
 * =====================================================
 * Validate Employee ID
 * =====================================================
 */

export const validateEmployeeId = (

    req,

    res,

    next

) => {

    const schema = Joi.object({

        id: Joi.number()

            .integer()

            .positive()

            .required()

            .messages({

                "number.base":
                    "Employee ID must be a number.",

                "number.integer":
                    "Employee ID must be an integer.",

                "number.positive":
                    "Employee ID must be greater than zero.",

                "any.required":
                    "Employee ID is required."

            })

    });

    const { error, value } =

        schema.validate(

            req.params

        );

    if (error) {

        return next(

            new ApiError(

                400,

                error.details[0].message

            )

        );

    }

    req.params = value;

    next();

};

/**
 * =====================================================
 * Employee Filter Schema
 * =====================================================
 */

const employeeFilterSchema = Joi.object({

    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(2000)
        .default(10),

    search: Joi.string()
        .trim()
        .allow("")
        .optional(),

    department_id: Joi.number()
        .integer()
        .positive()
        .optional(),

    role: Joi.string()
        .valid(
            "MANAGER", "ADMIN", "SUPER_ADMIN", "COUNSELLOR", "HR", "TL", "TRAINER", "EMPLOYEE", "INTERN",
            "COUNSELLOR"
        )
        .optional(),

    status: Joi.string()
        .valid(
            "ACTIVE",
            "INACTIVE",
            "ON_LEAVE",
            "SUSPENDED"
        )
        .optional(),

    employment_type: Joi.string()
        .valid(
            "FULL_TIME",
            "PART_TIME",
            "CONTRACT",
            "INTERN"
        )
        .optional(),

    sort_by: Joi.string()
        .valid(
            "full_name",
            "email",
            "joining_date",
            "created_at"
        )
        .default("created_at"),

    sort_order: Joi.string()
        .valid(
            "ASC",
            "DESC"
        )
        .default("DESC")

}).options({

    abortEarly: false,

    stripUnknown: true,

});

/**
 * =====================================================
 * Validate Employee Filters
 * =====================================================
 */

export const validateEmployeeFilters = (

    req,

    res,

    next

) => {

    const { error, value } =
    employeeFilterSchema.validate(req.query);

if (error) {

    return next(
        new ApiError(
            400,
            error.details
                .map(item => item.message)
                .join(", ")
        )
    );

}

Object.assign(req.query, value);

next();

};
