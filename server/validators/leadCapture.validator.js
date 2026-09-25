import { body } from "express-validator";

export const capturePublicLeadValidator = [

  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Full name must be between 3 and 100 characters."),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Invalid mobile number."),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body("campaign_id")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Invalid campaign id."),

  body("source")
    .notEmpty()
    .withMessage("Source is required.")
    .isIn([
      "META",
      "GOOGLE",
      "WEBSITE",
      "LANDING_PAGE",
      "INSTAGRAM",
      "WHATSAPP",
      "REFERRAL",
      "OFFLINE",
      "CALL",
      "MANUAL",
      "DIRECT",
      "OTHER"
    ])
    .withMessage("Invalid lead source."),

  body("utm_source")
    .optional()
    .trim()
    .isLength({ max: 100 }),

  body("utm_medium")
    .optional()
    .trim()
    .isLength({ max: 100 }),

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

  body("domain")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 150 })
    .withMessage("Domain cannot exceed 150 characters."),

  body("interested_course")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Interested course cannot exceed 200 characters.")

];
