const router = require("express").Router();
const rentalController = require("./rental.controller");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const { paginationValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");
const { bookingLimiter } = require("../../middlewares/rateLimiter");

// ─── Public ────────────────────────────────────────────────────────

/**
 * @swagger
 * /rentals:
 *   get:
 *     summary: Get rental spaces (public, paginated)
 *     tags: [Rentals]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: Filter by location (contains)
 *       - in: query
 *         name: isAvailable
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated rental spaces
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   location: "Rooftop Dhaka"
 *                   size: "10sqm"
 *                   pricePerDay: 500.00
 *                   isAvailable: true
 *                   vendor:
 *                     farmName: "Green Acres"
 *               meta:
 *                 total: 10
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  "/",
  [...paginationValidator, validate],
  rentalController.getRentalSpaces
);

/**
 * @swagger
 * /rentals/{id}:
 *   get:
 *     summary: Get single rental space (public)
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rental space details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", location: "Rooftop Dhaka", size: "10sqm", pricePerDay: 500.00, vendor: { farmName: "Green Acres" } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  rentalController.getRentalSpaceById
);

// ─── Vendor: manage spaces ─────────────────────────────────────────

/**
 * @swagger
 * /rentals:
 *   post:
 *     summary: Create a rental space (vendor only)
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [location, size, pricePerDay]
 *             properties:
 *               location: { type: string }
 *               size: { type: string }
 *               pricePerDay: { type: number }
 *           example:
 *             location: "Rooftop Gulshan"
 *             size: "10sqm"
 *             pricePerDay: 500.00
 *     responses:
 *       201:
 *         description: Rental space created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Rental space created", data: { id: "uuid", isAvailable: true } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  "/",
  [authenticate, authorize("VENDOR")],
  rentalController.createRentalSpace
);

/**
 * @swagger
 * /rentals/{id}:
 *   patch:
 *     summary: Update own rental space (vendor only)
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location: { type: string }
 *               size: { type: string }
 *               pricePerDay: { type: number }
 *           example:
 *             location: "Updated location"
 *             pricePerDay: 600.00
 *     responses:
 *       200:
 *         description: Rental space updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Rental space updated", data: { location: "Updated location" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id",
  [authenticate, authorize("VENDOR")],
  rentalController.updateRentalSpace
);

/**
 * @swagger
 * /rentals/{id}:
 *   delete:
 *     summary: Delete own rental space (vendor only)
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rental space deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Rental space deleted", data: null }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete(
  "/:id",
  [authenticate, authorize("VENDOR")],
  rentalController.deleteRentalSpace
);

// ─── Customer: book a space ────────────────────────────────────────

/**
 * @swagger
 * /rentals/{id}/book:
 *   post:
 *     summary: Book a rental space (customer only)
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Rental space ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startDate, endDate]
 *             properties:
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *           example:
 *             startDate: "2026-05-01"
 *             endDate: "2026-05-05"
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Booking created", data: { id: "uuid", status: "PENDING", totalPrice: 2000.00 } }
 *       400:
 *         description: Space not available or invalid dates
 *         content:
 *           application/json:
 *             example: { success: false, message: "This rental space is not available" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  "/:id/book",
  [bookingLimiter, authenticate, authorize("CUSTOMER")],
  rentalController.bookRentalSpace
);

// ─── Booking management ────────────────────────────────────────────

/**
 * @swagger
 * /rentals/bookings/{bookingId}/confirm:
 *   patch:
 *     summary: Confirm a booking (admin or space owner vendor)
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking confirmed, space marked unavailable
 *         content:
 *           application/json:
 *             example: { success: true, message: "Booking confirmed" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/bookings/:bookingId/confirm",
  [authenticate, authorize("ADMIN", "VENDOR")],
  rentalController.confirmBooking
);

/**
 * @swagger
 * /rentals/bookings/{bookingId}/cancel:
 *   patch:
 *     summary: Cancel a booking (owner, vendor, or admin)
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Booking cancelled, space marked available
 *         content:
 *           application/json:
 *             example: { success: true, message: "Booking cancelled" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/bookings/:bookingId/cancel",
  [authenticate],
  rentalController.cancelBooking
);

/**
 * @swagger
 * /rentals/bookings/my:
 *   get:
 *     summary: Get customer's bookings
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: Customer's bookings
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   status: "CONFIRMED"
 *                   totalPrice: 2000.00
 *                   rentalSpace:
 *                     location: "Rooftop"
 *               meta:
 *                 total: 2
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/bookings/my",
  [authenticate, authorize("CUSTOMER"), ...paginationValidator, validate],
  rentalController.getMyBookings
);

/**
 * @swagger
 * /rentals/bookings/vendor:
 *   get:
 *     summary: Get bookings for vendor's spaces
 *     tags: [Rentals]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *     responses:
 *       200:
 *         description: Vendor's space bookings
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   status: "CONFIRMED"
 *                   user:
 *                     name: "Customer"
 *               meta:
 *                 total: 3
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/bookings/vendor",
  [authenticate, authorize("VENDOR"), ...paginationValidator, validate],
  rentalController.getVendorBookings
);

module.exports = router;
