const apiResponse = require("../utils/apiResponse");

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return apiResponse.error(res, "Forbidden — insufficient permissions", 403);
    }
    next();
  };
};

module.exports = authorize;
