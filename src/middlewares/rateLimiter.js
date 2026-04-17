const rateLimit = require("express-rate-limit");
const apiResponse = require("../utils/apiResponse");

const createLimiter = (max, windowMs, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      return apiResponse.error(res, message, 429);
    },
  });

const authLimiter = createLimiter(
  10,
  15 * 60 * 1000,
  "Too many authentication attempts, please try again later"
);

const apiLimiter = createLimiter(
  100,
  15 * 60 * 1000,
  "Too many requests, please try again later"
);

const orderLimiter = createLimiter(
  20,
  15 * 60 * 1000,
  "Too many order requests, please try again later"
);

const bookingLimiter = createLimiter(
  15,
  15 * 60 * 1000,
  "Too many booking requests, please try again later"
);

const uploadLimiter = createLimiter(
  5,
  60 * 60 * 1000,
  "Too many upload requests, please try again later"
);

module.exports = { authLimiter, apiLimiter, orderLimiter, bookingLimiter, uploadLimiter };
