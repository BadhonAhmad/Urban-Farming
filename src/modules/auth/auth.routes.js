const router = require("express").Router();
const authController = require("./auth.controller");
const { authLimiter } = require("../../middlewares/rateLimiter");
const { registerValidator, loginValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");
const authenticate = require("../../middlewares/authenticate");

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [CUSTOMER, VENDOR] }
 *           example:
 *             name: "John Doe"
 *             email: "john@example.com"
 *             password: "password123"
 *             role: "CUSTOMER"
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Registration successful
 *               data: { id: "uuid", name: "John Doe", email: "john@example.com", role: "CUSTOMER", vendorProfile: null }
 *       409:
 *         description: Duplicate email
 *         content:
 *           application/json:
 *             example: { success: false, message: "Duplicate value for email" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
router.post("/register", [authLimiter, ...registerValidator, validate], authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *           example:
 *             email: "john@example.com"
 *             password: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login successful
 *               data: { user: { id: "uuid", name: "John Doe", email: "john@example.com", role: "CUSTOMER" }, token: "eyJhbGciOi..." }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid email or password" }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
router.post("/login", [authLimiter, ...loginValidator, validate], authController.login);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Profile fetched
 *               data: { id: "uuid", name: "John Doe", email: "john@example.com", role: "CUSTOMER", vendorProfile: null }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get("/profile", authenticate, authController.getProfile);

module.exports = router;
