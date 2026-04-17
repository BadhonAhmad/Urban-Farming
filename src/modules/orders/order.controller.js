const orderService = require("./order.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    logger.info(`Order created: ${order.id} by user ${req.user.id}`);
    return apiResponse.success(res, order, "Order created", 201);
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await orderService.getMyOrders(req.user.id, page, limit);
    return apiResponse.paginate(res, result.orders, result.total, result.page, result.limit, "My orders fetched");
  } catch (error) {
    next(error);
  }
};

const getVendorOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await orderService.getVendorOrders(req.user.id, page, limit);
    return apiResponse.paginate(res, result.orders, result.total, result.page, result.limit, "Vendor orders fetched");
  } catch (error) {
    next(error);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await orderService.getAllOrders(page, limit);
    return apiResponse.paginate(res, result.orders, result.total, result.page, result.limit, "All orders fetched");
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user.id, req.user.role);
    return apiResponse.success(res, order, "Order fetched");
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const result = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
      req.user.id,
      req.user.role
    );
    logger.info(`Order ${req.params.id} status updated to ${req.body.status}`);
    return apiResponse.success(res, result, "Order status updated");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getVendorOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
