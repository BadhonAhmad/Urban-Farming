const router = require("express").Router();
const trackingController = require("./tracking.controller");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const { paginationValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");

/**
 * @swagger
 * /tracking:
 *   get:
 *     summary: Get current user's plant tracking records
 *     tags: [PlantTracking]
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
 *         description: Paginated list of plant tracking records
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: My plants fetched
 *               data:
 *                 - id: "uuid"
 *                   plantName: "Tomato"
 *                   growthStage: "VEGETATIVE"
 *                   healthStatus: "HEALTHY"
 *                   notes: "Growing well"
 *                   rentalSpace: { location: "Rooftop Dhaka", size: "10sqm" }
 *               meta: { total: 5, page: 1, limit: 10, totalPages: 1 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  "/",
  [authenticate, authorize("CUSTOMER"), ...paginationValidator, validate],
  trackingController.getMyPlants
);

/**
 * @swagger
 * /tracking/{id}:
 *   get:
 *     summary: Get a single plant tracking record
 *     tags: [PlantTracking]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Plant tracking record
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", plantName: "Tomato", growthStage: "VEGETATIVE", healthStatus: "HEALTHY", rentalSpace: { location: "Rooftop" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  [authenticate, authorize("CUSTOMER")],
  trackingController.getPlantById
);

/**
 * @swagger
 * /tracking:
 *   post:
 *     summary: Add a plant tracking entry
 *     tags: [PlantTracking]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rentalSpaceId, plantName, growthStage, healthStatus]
 *             properties:
 *               rentalSpaceId: { type: string, format: uuid }
 *               plantName: { type: string }
 *               growthStage: { type: string, enum: [SEEDLING, VEGETATIVE, FLOWERING, FRUITING, HARVEST] }
 *               healthStatus: { type: string, enum: [HEALTHY, NEEDS_WATER, DISEASED, HARVESTED] }
 *               notes: { type: string }
 *           example:
 *             rentalSpaceId: "uuid-of-space"
 *             plantName: "Cherry Tomato"
 *             growthStage: "SEEDLING"
 *             healthStatus: "HEALTHY"
 *             notes: "Planted last week"
 *     responses:
 *       201:
 *         description: Plant tracking record created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Plant tracking added
 *               data: { id: "uuid", plantName: "Cherry Tomato", growthStage: "SEEDLING", rentalSpace: { location: "Rooftop" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  "/",
  [authenticate, authorize("CUSTOMER")],
  trackingController.addTracking
);

/**
 * @swagger
 * /tracking/{id}:
 *   patch:
 *     summary: Update a plant tracking record
 *     tags: [PlantTracking]
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
 *               growthStage: { type: string, enum: [SEEDLING, VEGETATIVE, FLOWERING, FRUITING, HARVEST] }
 *               healthStatus: { type: string, enum: [HEALTHY, NEEDS_WATER, DISEASED, HARVESTED] }
 *               notes: { type: string }
 *           example:
 *             growthStage: "FLOWERING"
 *             healthStatus: "NEEDS_WATER"
 *             notes: "Needs watering soon"
 *     responses:
 *       200:
 *         description: Plant status updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Plant status updated
 *               data: { id: "uuid", growthStage: "FLOWERING", healthStatus: "NEEDS_WATER" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id",
  [authenticate, authorize("CUSTOMER")],
  trackingController.updatePlantStatus
);

/**
 * @swagger
 * /tracking/{id}:
 *   delete:
 *     summary: Delete a plant tracking record
 *     tags: [PlantTracking]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Plant tracking deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Plant tracking deleted", data: null }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete(
  "/:id",
  [authenticate, authorize("CUSTOMER")],
  trackingController.deleteTracking
);

module.exports = router;
