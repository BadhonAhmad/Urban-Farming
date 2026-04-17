const router = require("express").Router();
const vendorController = require("./vendor.controller");
const authenticate = require("../../middlewares/authenticate");
const authorize = require("../../middlewares/authorize");
const { paginationValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");
const { uploadLimiter } = require("../../middlewares/rateLimiter");

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get all vendor profiles (admin only)
 *     tags: [Vendors]
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
 *         description: Paginated vendor list
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: "uuid"
 *                   farmName: "Green Acres"
 *                   farmLocation: "Dhaka"
 *                   certificationStatus: "APPROVED"
 *                   user: { name: "Vendor1", email: "vendor1@mail.com" }
 *               meta: { total: 10, page: 1, limit: 10, totalPages: 1 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  "/",
  [authenticate, authorize("ADMIN"), ...paginationValidator, validate],
  vendorController.getAllVendors
);

/**
 * @swagger
 * /vendors/me:
 *   get:
 *     summary: Get current vendor's profile
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Vendor profile with produce and certification
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { id: "uuid", farmName: "Green Acres", farmLocation: "Dhaka", certificationStatus: "APPROVED", produce: [], sustainabilityCert: { certifyingAgency: "OrganicBD" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/me",
  [authenticate, authorize("VENDOR")],
  vendorController.getMyProfile
);

/**
 * @swagger
 * /vendors/me:
 *   patch:
 *     summary: Update current vendor's profile
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               farmName: { type: string }
 *               farmLocation: { type: string }
 *           example:
 *             farmName: "Green Acres Updated"
 *             farmLocation: "Gulshan, Dhaka"
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Profile updated", data: { farmName: "Green Acres Updated" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/me",
  [authenticate, authorize("VENDOR")],
  vendorController.updateProfile
);

/**
 * @swagger
 * /vendors/{vendorId}/approve:
 *   patch:
 *     summary: Approve a vendor (admin only)
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor approved
 *         content:
 *           application/json:
 *             example: { success: true, message: "Vendor approved", data: { certificationStatus: "APPROVED" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:vendorId/approve",
  [authenticate, authorize("ADMIN")],
  vendorController.approveVendor
);

/**
 * @swagger
 * /vendors/{vendorId}/reject:
 *   patch:
 *     summary: Reject a vendor (admin only)
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor rejected
 *         content:
 *           application/json:
 *             example: { success: true, message: "Vendor rejected", data: { certificationStatus: "REJECTED" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:vendorId/reject",
  [authenticate, authorize("ADMIN")],
  vendorController.rejectVendor
);

/**
 * @swagger
 * /vendors/certification:
 *   post:
 *     summary: Submit sustainability certification
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [certifyingAgency, certificationDate, expiryDate, documentUrl]
 *             properties:
 *               certifyingAgency: { type: string }
 *               certificationDate: { type: string, format: date }
 *               expiryDate: { type: string, format: date }
 *               documentUrl: { type: string, format: uri }
 *           example:
 *             certifyingAgency: "Bangladesh Organic"
 *             certificationDate: "2025-01-01"
 *             expiryDate: "2027-01-01"
 *             documentUrl: "https://example.com/cert.pdf"
 *     responses:
 *       201:
 *         description: Certification submitted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Certification submitted", data: { certifyingAgency: "Bangladesh Organic" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  "/certification",
  [uploadLimiter, authenticate, authorize("VENDOR")],
  vendorController.submitCertification
);

/**
 * @swagger
 * /vendors/{vendorId}/certification/approve:
 *   patch:
 *     summary: Approve vendor certification (admin only)
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Certification approved
 *         content:
 *           application/json:
 *             example: { success: true, message: "Certification approved", data: { certificationStatus: "APPROVED" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:vendorId/certification/approve",
  [authenticate, authorize("ADMIN")],
  vendorController.approveCertification
);

/**
 * @swagger
 * /vendors/{vendorId}/certification/reject:
 *   patch:
 *     summary: Reject vendor certification (admin only)
 *     tags: [Vendors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Certification rejected
 *         content:
 *           application/json:
 *             example: { success: true, message: "Certification rejected", data: { certificationStatus: "REJECTED" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:vendorId/certification/reject",
  [authenticate, authorize("ADMIN")],
  vendorController.rejectCertification
);

module.exports = router;
