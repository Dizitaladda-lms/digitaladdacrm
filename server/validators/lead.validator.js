import { body, param } from "express-validator";

export const createLeadValidator = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 150 })
    .withMessage("Full name must be between 3 and 150 characters."),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile is required.")
    .isLength({ min: 10, max: 15 })
    .withMessage("Mobile is invalid."),

  body("source")
    .trim()
    .notEmpty()
    .withMessage("Source is required.")
    .isLength({ max: 150 })
    .withMessage("Source cannot exceed 150 characters."),

  body("domain")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Domain name cannot exceed 150 characters."),

  body("campaign_id")
    .optional()
    .isInt()
    .withMessage("Campaign ID must be an integer."),

  body("assigned_to")
    .optional()
    .isInt()
    .withMessage("Assigned employee must be an integer."),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email address."),

  body("alternate_mobile")
    .optional()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage("Alternate mobile is invalid."),

  body("country")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("state")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("city")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("interested_course")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("preferred_centre")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("platform")
    .optional()
    .isIn([
      "GOOGLE",
      "META",
      "WEBSITE",
      "WHATSAPP",
      "IMPORT",
      "MANUAL",
    ])
    .withMessage("Invalid platform."),

  body("landing_page_url")
    .optional()
    .isURL()
    .withMessage("Invalid landing page URL."),

  body("utm_source")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("utm_medium")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("utm_campaign")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("utm_content")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("utm_term")
    .optional()
    .trim()
    .isLength({ max: 150 }),

  body("external_lead_id")
    .optional()
    .trim()
    .isLength({ max: 255 }),

  body("captured_at")
    .optional()
    .isISO8601()
    .withMessage("Invalid captured date."),
];

export const updateLeadValidator = [
body("domain").optional({ nullable: true }).trim().isLength({ max: 150 }),

body("alternate_mobile").optional(),

body("country").optional(),

body("state").optional(),

body("city").optional(),

body("interested_course").optional(),

body("preferred_centre").optional(),

body("platform").optional(),

body("landing_page_url").optional(),

body("utm_source").optional(),

body("utm_medium").optional(),

body("utm_campaign").optional(),

body("utm_content").optional(),

body("utm_term").optional(),

body("external_lead_id").optional(),

body("captured_at").optional(),

];

export const updateLeadStatusValidator = [

  param("id")
    .isInt()
    .withMessage("Invalid lead id."),

  body("status")
    .trim()
    .notEmpty()
    .withMessage("Status is required.")
    .isIn([
      "PENDING",
      "COMPLETED",
      "REJECTED",
    ])
    .withMessage("Invalid lead status."),

  body("feedback")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Feedback cannot exceed 1000 characters."),

  body("feedback").custom((value, { req }) => {

    if (
      req.body.status === "REJECTED" &&
      (!value || !value.trim())
    ) {
      throw new Error(
        "Feedback is required when rejecting a lead."
      );
    }

    return true;

  }),

];

export const addLeadNoteValidator = [

  param("id")
    .isInt(),

  body("note")
    .trim()
    .notEmpty()
    .withMessage("Note is required.")
    .isLength({
      min: 3,
      max: 1000,
    }),

];

// =====================================================
// Bulk Lead Assignment Validator
// =====================================================

export const assignBulkLeadValidator = [
  body("lead_ids")
    .isArray({ min: 1 })
    .withMessage("At least one lead must be selected."),

  body("lead_ids.*")
    .isInt()
    .withMessage("Invalid lead id."),

  body("employee_id")
    .isInt()
    .withMessage("Employee is required."),

  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Remarks cannot exceed 1000 characters."),

  body("note")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Note cannot exceed 1000 characters."),

  body("assignment_type")
    .optional()
    .trim()
    .isIn(["MANUAL", "ROUND_ROBIN"])
    .withMessage("Invalid assignment type."),

  body("priority")
    .optional()
    .trim()
    .isIn(["LOW", "NORMAL", "HIGH"])
    .withMessage("Invalid priority."),
];

export const assignLeadValidator = [
  param("id")
    .isInt()
    .withMessage("Invalid lead id."),

  body("employee_id")
    .isInt()
    .withMessage("Employee id is required."),

  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Remarks cannot exceed 1000 characters."),

  body("note")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Note cannot exceed 1000 characters."),

  body("assignment_type")
    .optional()
    .trim()
    .isIn(["MANUAL", "ROUND_ROBIN"])
    .withMessage("Invalid assignment type."),

  body("priority")
    .optional()
    .trim()
    .isIn(["LOW", "NORMAL", "HIGH"])
    .withMessage("Invalid priority."),
];