const router = require("express").Router();
const produceController = require("./produce.controller");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const { paginationValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");

/**
 * @swagger
 * /produce:
 *   get:
 *     summary: Get approved produce list (public)
 *     tags: [Produce]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filter by category (contains match)
 *     responses:
 *       200:
 *         description: Paginated produce list (approved only)
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   name: "Organic Tomatoes"
 *                   price: 50.00
 *                   category: "VEGETABLES"
 *                   availableQuantity: 95
 *                   vendor: { farmName: "Green Acres", farmLocation: "Dhaka" }
 *               meta: { total: 50, page: 1, limit: 10, totalPages: 5 }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  "/",
  [...paginationValidator, validate],
  produceController.getProduceList
);

/**
 * @swagger
 * /produce/my:
 *   get:
 *     summary: Get current vendor's produce (all statuses)
 *     tags: [Produce]
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
 *         description: Vendor's own produce list
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   name: "Tomatoes"
 *                   certificationStatus: "PENDING"
 *                   availableQuantity: 100
 *               meta: { total: 10, page: 1, limit: 10, totalPages: 1 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get(
  "/my",
  [authenticate, authorize("VENDOR"), ...paginationValidator, validate],
  produceController.getMyProduce
);

/**
 * @swagger
 * /produce/{id}:
 *   get:
 *     summary: Get single produce by ID (public)
 *     tags: [Produce]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produce details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", name: "Organic Tomatoes", price: 50.00, vendor: { farmName: "Green Acres" } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  produceController.getProduceById
);

/**
 * @swagger
 * /produce:
 *   post:
 *     summary: Create produce item (vendor only)
 *     tags: [Produce]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, category, availableQuantity]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               availableQuantity: { type: integer }
 *           example:
 *             name: "Organic Tomatoes"
 *             description: "Fresh from the farm"
 *             price: 50.00
 *             category: "VEGETABLES"
 *             availableQuantity: 100
 *     responses:
 *       201:
 *         description: Produce created (pending approval)
 *         content:
 *           application/json:
 *             example: { success: true, message: "Produce created", data: { id: "uuid", certificationStatus: "PENDING" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post(
  "/",
  [authenticate, authorize("VENDOR")],
  produceController.createProduce
);

/**
 * @swagger
 * /produce/{id}:
 *   patch:
 *     summary: Update own produce (vendor only)
 *     tags: [Produce]
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
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               availableQuantity: { type: integer }
 *           example:
 *             name: "Premium Tomatoes"
 *             price: 60.00
 *     responses:
 *       200:
 *         description: Produce updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Produce updated", data: { name: "Premium Tomatoes" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id",
  [authenticate, authorize("VENDOR")],
  produceController.updateProduce
);

/**
 * @swagger
 * /produce/{id}:
 *   delete:
 *     summary: Delete produce (vendor owner or admin)
 *     tags: [Produce]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produce deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Produce deleted", data: null }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete(
  "/:id",
  [authenticate, authorize("VENDOR", "ADMIN")],
  produceController.deleteProduce
);

/**
 * @swagger
 * /produce/{id}/approve:
 *   patch:
 *     summary: Approve produce (admin only)
 *     tags: [Produce]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produce approved
 *         content:
 *           application/json:
 *             example: { success: true, message: "Produce approved", data: { certificationStatus: "APPROVED" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id/approve",
  [authenticate, authorize("ADMIN")],
  produceController.approveProduce
);

/**
 * @swagger
 * /produce/{id}/reject:
 *   patch:
 *     summary: Reject produce (admin only)
 *     tags: [Produce]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Produce rejected
 *         content:
 *           application/json:
 *             example: { success: true, message: "Produce rejected", data: { certificationStatus: "REJECTED" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id/reject",
  [authenticate, authorize("ADMIN")],
  produceController.rejectProduce
);

module.exports = router;
