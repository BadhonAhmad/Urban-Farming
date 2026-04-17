const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Urban Farming API",
      version: "1.0.0",
      description:
        "Interactive Urban Farming Platform — REST API for managing vendors, produce marketplace, rental spaces, orders, community forum, and plant tracking.",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      responses: {
        Unauthorized: {
          description: "Authentication required or token invalid",
          content: {
            "application/json": {
              example: { success: false, message: "Authorization token is required", errors: null, timestamp: "2026-01-01T00:00:00.000Z" },
            },
          },
        },
        Forbidden: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              example: { success: false, message: "Forbidden — insufficient permissions", errors: null, timestamp: "2026-01-01T00:00:00.000Z" },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              example: { success: false, message: "Resource not found", errors: null, timestamp: "2026-01-01T00:00:00.000Z" },
            },
          },
        },
        ValidationError: {
          description: "Validation failed",
          content: {
            "application/json": {
              example: {
                success: false,
                message: "Validation failed",
                errors: [{ field: "email", message: "A valid email is required" }],
                timestamp: "2026-01-01T00:00:00.000Z",
              },
            },
          },
        },
        RateLimited: {
          description: "Too many requests",
          content: {
            "application/json": {
              example: { success: false, message: "Too many requests, please try again later", errors: null, timestamp: "2026-01-01T00:00:00.000Z" },
            },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication & registration" },
      { name: "Vendors", description: "Vendor management & certification" },
      { name: "Produce", description: "Produce marketplace" },
      { name: "Rentals", description: "Rental spaces & bookings" },
      { name: "Orders", description: "Order management" },
      { name: "Forum", description: "Community forum" },
      { name: "PlantTracking", description: "Plant tracking & monitoring" },
    ],
  },
  apis: ["./src/modules/*/*.routes.js"],
};

module.exports = swaggerJsdoc(options);
