import { body, param, query } from "express-validator";

export const createAdmissionValidator = [
  body("student_name")
    .trim()
    .notEmpty()
    .withMessage("Student name is required.")
    .isLength({ min: 2, max: 150 })
    .withMessage("Student name must be between 2 and 150 characters."),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required.")
    .matches(/^[0-9+ ]{10,15}$/)
    .withMessage("Invalid mobile number format."),

  body("course_name")
    .trim()
    .notEmpty()
    .withMessage("Course name is required."),

  body("total_fee")
    .notEmpty()
    .withMessage("Total course fee is required.")
    .isFloat({ min: 0 })
    .withMessage("Total fee must be a valid non-negative number."),

  body("paid_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Paid fee must be a valid non-negative number."),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage("Invalid email address."),

  body("centre")
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body("next_due_date")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid due date format (YYYY-MM-DD)."),
];

export const addPaymentValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Invalid admission ID."),

  body("amount")
    .notEmpty()
    .withMessage("Payment amount is required.")
    .isFloat({ min: 1 })
    .withMessage("Payment amount must be greater than 0."),

  body("payment_mode")
    .optional()
    .trim()
    .isIn(["UPI", "CASH", "CHEQUE", "BANK_TRANSFER", "ONLINE", "CARD"])
    .withMessage("Invalid payment mode."),

  body("receipt_number")
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body("payment_date")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid payment date format."),

  body("next_due_date")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid next due date format."),
];
