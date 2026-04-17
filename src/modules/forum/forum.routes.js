const router = require("express").Router();
const forumController = require("./forum.controller");
const authenticate = require("../../middlewares/authenticate");
const { paginationValidator } = require("../../utils/validators");
const validate = require("../../middlewares/validate");

/**
 * @swagger
 * /forum:
 *   get:
 *     summary: Get all forum posts (public)
 *     tags: [Forum]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title or content
 *     responses:
 *       200:
 *         description: Paginated list of posts
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Posts fetched
 *               data:
 *                 - id: "uuid"
 *                   title: "Best soil for rooftop farming?"
 *                   postContent: "I've been using..."
 *                   postDate: "2026-01-01T00:00:00.000Z"
 *                   user: { name: "John" }
 *               meta: { total: 5, page: 1, limit: 10, totalPages: 1 }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
router.get(
  "/",
  [...paginationValidator, validate],
  forumController.getPosts
);

/**
 * @swagger
 * /forum/{id}:
 *   get:
 *     summary: Get a single forum post
 *     tags: [Forum]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Post fetched
 *               data: { id: "uuid", title: "Title", postContent: "Content", user: { name: "John", email: "john@mail.com" } }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get(
  "/:id",
  forumController.getPostById
);

/**
 * @swagger
 * /forum:
 *   post:
 *     summary: Create a forum post
 *     tags: [Forum]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, postContent]
 *             properties:
 *               title: { type: string }
 *               postContent: { type: string }
 *           example:
 *             title: "Best soil for rooftop farming?"
 *             postContent: "I've been using a mix of coco coir and compost."
 *     responses:
 *       201:
 *         description: Post created
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Post created
 *               data: { id: "uuid", title: "Best soil for rooftop farming?", postContent: "I've been using...", user: { name: "John" } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *       429: { $ref: '#/components/responses/RateLimited' }
 */
router.post(
  "/",
  [authenticate],
  forumController.createPost
);

/**
 * @swagger
 * /forum/{id}:
 *   patch:
 *     summary: Update a forum post (author or admin)
 *     tags: [Forum]
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
 *               title: { type: string }
 *               postContent: { type: string }
 *           example:
 *             title: "Updated title"
 *             postContent: "Updated content"
 *     responses:
 *       200:
 *         description: Post updated
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Post updated
 *               data: { id: "uuid", title: "Updated title", postContent: "Updated content" }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch(
  "/:id",
  [authenticate],
  forumController.updatePost
);

/**
 * @swagger
 * /forum/{id}:
 *   delete:
 *     summary: Delete a forum post (author or admin)
 *     tags: [Forum]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Post deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Post deleted", data: null }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.delete(
  "/:id",
  [authenticate],
  forumController.deletePost
);

module.exports = router;
