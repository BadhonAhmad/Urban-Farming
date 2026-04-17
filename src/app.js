const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// ─── Global Middlewares ──────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(express.json());

// ─── Rate Limiting ───────────────────────────────────────────────────

const { apiLimiter } = require("./middlewares/rateLimiter");
app.use(apiLimiter);

// ─── Health Check ────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Documentation ───────────────────────────────────────────────

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ──────────────────────────────────────────────────────────

app.use("/api/v1/auth", require("./modules/auth/auth.routes"));
app.use("/api/v1/vendors", require("./modules/vendor/vendor.routes"));
app.use("/api/v1/produce", require("./modules/produce/produce.routes"));
app.use("/api/v1/rentals", require("./modules/rental/rental.routes"));
app.use("/api/v1/orders", require("./modules/orders/order.routes"));
app.use("/api/v1/forum", require("./modules/forum/forum.routes"));
app.use("/api/v1/tracking", require("./modules/tracking/tracking.routes"));

// ─── 404 Handler ─────────────────────────────────────────────────────

app.use((_req, res) => {
  const apiResponse = require("./utils/apiResponse");
  return apiResponse.error(res, "Route not found", 404);
});

// ─── Global Error Handler ────────────────────────────────────────────

const errorHandler = require("./middlewares/errorHandler");
app.use(errorHandler);

module.exports = app;
