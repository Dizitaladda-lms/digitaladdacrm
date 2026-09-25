import { body } from "express-validator";

/**
 * =====================================================
 * Register Validator
 *
 * SECURITY FIX (see audit notes) - CRITICAL:
 * This previously required a client-supplied `role`
 * field and explicitly whitelisted "ADMIN" as a valid
 * value for this fully public, unauthenticated
 * registration endpoint. Combined with the corresponding
 * bug in authService.js's registerUserService (also
 * fixed - see that file), this allowed anyone on the
 * internet to self-register a working Admin account.
 *
 * The `role` field is removed entirely here, not just
 * left unvalidated - authService.js now force-sets the
 * role server-side regardless of what's in the request
 * body, so accepting this field here would be both
 * pointless and misleading (it would suggest to a future
 * developer that role is a legitimate, honored input).
 * =====================================================
 */

export const registerValidator = [

  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage(
      "Full name must be between 3 and 100 characters."
    ),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage(
      "Password must be at least 8 characters."
    )
    .matches(/[A-Z]/)
    .withMessage(
      "Password must contain at least one uppercase letter."
    )
    .matches(/[a-z]/)
    .withMessage(
      "Password must contain at least one lowercase letter."
    )
    .matches(/[0-9]/)
    .withMessage(
      "Password must contain at least one number."
    )
    .matches(/[!@#$%^&*]/)
    .withMessage(
      "Password must contain at least one special character."
    ),

];

export const loginValidator = [

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email or username is required."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")

];

export const changePasswordValidator = [

  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage(
      "Password must be at least 8 characters."
    )

];

export const updateProfileValidator = [
  body("full_name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Full name must be between 3 and 100 characters."),
  body("profile_image")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Profile image must be a string.")
    .isLength({ max: 2100000 })
    .withMessage("Profile image is too large.")
    .matches(/^data:image\/(png|jpeg|webp);base64,/)
    .withMessage("Use a PNG, JPEG, or WebP image."),
];

export const forgotPasswordValidator = [

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Invalid email.")

];

export const resetPasswordValidator = [

  body("token")
    .notEmpty()
    .withMessage("Reset token is required."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage(
      "Password must be at least 8 characters."
    )

];