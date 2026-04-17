const { body, query } = require("express-validator");

const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),

  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),

  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),

  body("role")
    .optional()
    .isIn(["CUSTOMER", "VENDOR"])
    .withMessage("Role must be CUSTOMER or VENDOR"),
];

const loginValidator = [
  body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),
];

const paginationValidator = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be an integer >= 1").toInt(),

  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100").toInt(),
];

module.exports = { registerValidator, loginValidator, paginationValidator };
