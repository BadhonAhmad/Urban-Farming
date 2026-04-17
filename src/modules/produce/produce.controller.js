const produceService = require("./produce.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const createProduce = async (req, res, next) => {
  try {
    const produce = await produceService.createProduce(req.user.id, req.body);
    logger.info(`Produce created: ${produce.id} by vendor ${req.user.id}`);
    return apiResponse.success(res, produce, "Produce created", 201);
  } catch (error) {
    next(error);
  }
};

const getProduceList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = { category: req.query.category };
    const result = await produceService.getProduceList(filters, page, limit);
    return apiResponse.paginate(res, result.produce, result.total, result.page, result.limit, "Produce list fetched");
  } catch (error) {
    next(error);
  }
};

const getProduceById = async (req, res, next) => {
  try {
    const produce = await produceService.getProduceById(req.params.id);
    return apiResponse.success(res, produce, "Produce fetched");
  } catch (error) {
    next(error);
  }
};

const updateProduce = async (req, res, next) => {
  try {
    const produce = await produceService.updateProduce(req.user.id, req.params.id, req.body);
    logger.info(`Produce updated: ${req.params.id}`);
    return apiResponse.success(res, produce, "Produce updated");
  } catch (error) {
    next(error);
  }
};

const deleteProduce = async (req, res, next) => {
  try {
    await produceService.deleteProduce(req.user.id, req.params.id, req.user.role);
    logger.info(`Produce deleted: ${req.params.id}`);
    return apiResponse.success(res, null, "Produce deleted");
  } catch (error) {
    next(error);
  }
};

const approveProduce = async (req, res, next) => {
  try {
    const produce = await produceService.approveProduce(req.params.id);
    logger.info(`Produce approved: ${req.params.id}`);
    return apiResponse.success(res, produce, "Produce approved");
  } catch (error) {
    next(error);
  }
};

const rejectProduce = async (req, res, next) => {
  try {
    const produce = await produceService.rejectProduce(req.params.id);
    logger.info(`Produce rejected: ${req.params.id}`);
    return apiResponse.success(res, produce, "Produce rejected");
  } catch (error) {
    next(error);
  }
};

const getMyProduce = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await produceService.getMyProduce(req.user.id, page, limit);
    return apiResponse.paginate(res, result.produce, result.total, result.page, result.limit, "My produce fetched");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduce,
  getProduceList,
  getProduceById,
  updateProduce,
  deleteProduce,
  approveProduce,
  rejectProduce,
  getMyProduce,
};
