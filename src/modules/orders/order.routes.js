const router = require("express").Router();
const orderController = require("./order.controller");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const { paginationValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");
const { orderLimiter } = require("../../middlewares/rateLimiter");

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Place an order (customer only)
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [produceId, quantity]
 *             properties:
 *               produceId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1 }
 *           example:
 *             produceId: "uuid-of-produce"
 *             quantity: 5
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Order created
 *               data: { id: "uuid", quantity: 5, totalPrice: 250.00, status: "PENDING", produce: { name: "Tomatoes" }, vendor: { farmName: "Green Acres" } }
 *       400:
 *         description: Insufficient quantity or unapproved produce
 *         content:
 *           application/json:
 *             example: { success: false, message: "Only 3 items available" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  "/",
  [orderLimiter, authenticate, authorize("CUSTOMER")],
  orderController.createOrder
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders (admin only)
 *     tags: [Orders]
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
 *         description: All orders
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   quantity: 5
 *                   totalPrice: 250.00
 *                   status: "DELIVERED"
 *               meta:
 *                 total: 10
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/",
  [authenticate, authorize("ADMIN"), ...paginationValidator, validate],
  orderController.getAllOrders
);

/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: Get customer's orders
 *     tags: [Orders]
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
 *         description: Customer's orders
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   quantity: 5
 *                   totalPrice: 250.00
 *                   status: "PENDING"
 *                   produce:
 *                     name: "Tomatoes"
 *               meta:
 *                 total: 3
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/my",
  [authenticate, authorize("CUSTOMER"), ...paginationValidator, validate],
  orderController.getMyOrders
);

/**
 * @swagger
 * /orders/vendor:
 *   get:
 *     summary: Get orders for vendor's produce
 *     tags: [Orders]
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
 *         description: Vendor's orders
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   quantity: 5
 *                   status: "CONFIRMED"
 *                   user:
 *                     name: "Customer"
 *               meta:
 *                 total: 5
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/vendor",
  [authenticate, authorize("VENDOR"), ...paginationValidator, validate],
  orderController.getVendorOrders
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get single order (owner/vendor/admin)
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", quantity: 5, totalPrice: 250.00, status: "PENDING", produce: { name: "Tomatoes" }, vendor: { farmName: "Green Acres" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  [authenticate],
  orderController.getOrderById
);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: |
 *       Role-based rules:
 *       - **CUSTOMER**: Can only cancel (CANCELLED) their own PENDING orders
 *       - **VENDOR**: Can update to CONFIRMED, SHIPPED, DELIVERED for their own produce
 *       - **ADMIN**: Can update any order
 *     tags: [Orders]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [CONFIRMED, SHIPPED, DELIVERED, CANCELLED] }
 *           example:
 *             status: "CONFIRMED"
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Order status updated", data: { status: "CONFIRMED" } }
 *       400:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             example: { success: false, message: "Cannot transition order from CANCELLED to CONFIRMED" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id/status",
  [authenticate],
  orderController.updateOrderStatus
);

module.exports = router;
