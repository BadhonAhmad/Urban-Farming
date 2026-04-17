const { validationResult } = require("express-validator");
const apiResponse = require("../utils/apiResponse");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return apiResponse.error(res, "Validation failed", 422, formatted);
  }
  next();
};

module.exports = validate;
