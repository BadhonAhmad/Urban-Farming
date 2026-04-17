const forumService = require("./forum.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const result = await forumService.getPosts(page, limit, search);
    return apiResponse.paginate(res, result.posts, result.total, result.page, result.limit, "Posts fetched");
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const post = await forumService.getPostById(req.params.id);
    return apiResponse.success(res, post, "Post fetched");
  } catch (error) {
    next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const post = await forumService.createPost(req.user.id, req.body);
    logger.info(`Forum post created: ${post.id} by user ${req.user.id}`);
    return apiResponse.success(res, post, "Post created", 201);
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await forumService.updatePost(req.user.id, req.params.id, req.body, req.user.role);
    logger.info(`Forum post updated: ${req.params.id}`);
    return apiResponse.success(res, post, "Post updated");
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    await forumService.deletePost(req.user.id, req.params.id, req.user.role);
    logger.info(`Forum post deleted: ${req.params.id}`);
    return apiResponse.success(res, null, "Post deleted");
  } catch (error) {
    next(error);
  }
};

module.exports = { getPosts, getPostById, createPost, updatePost, deletePost };
