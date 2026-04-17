const { PrismaClientKnownRequestError } = require("@prisma/client/runtime/library");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const apiResponse = require("../utils/apiResponse");

const errorHandler = (err, _req, res, _next) => {
  logger.error(`${err.message}`);

  // Prisma unique constraint violation
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return apiResponse.error(res, `Duplicate value for ${field}`, 409);
    }
    if (err.code === "P2025") {
      return apiResponse.error(res, "Resource not found", 404);
    }
  }

  // JWT errors
  if (err instanceof jwt.JsonWebTokenError) {
    return apiResponse.error(res, "Invalid token", 401);
  }
  if (err instanceof jwt.TokenExpiredError) {
    return apiResponse.error(res, "Token expired", 401);
  }

  // Fallback
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;
  return apiResponse.error(res, message, statusCode);
};

module.exports = errorHandler;
