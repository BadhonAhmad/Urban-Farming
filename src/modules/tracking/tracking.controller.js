const trackingService = require("./tracking.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const getMyPlants = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await trackingService.getMyPlants(req.user.id, page, limit);
    return apiResponse.paginate(res, result.plants, result.total, result.page, result.limit, "My plants fetched");
  } catch (error) {
    next(error);
  }
};

const getPlantById = async (req, res, next) => {
  try {
    const plant = await trackingService.getPlantById(req.user.id, req.params.id);
    return apiResponse.success(res, plant, "Plant record fetched");
  } catch (error) {
    next(error);
  }
};

const addTracking = async (req, res, next) => {
  try {
    const plant = await trackingService.addTracking(req.user.id, req.body);
    logger.info(`Plant tracking added: ${plant.id} by user ${req.user.id}`);
    return apiResponse.success(res, plant, "Plant tracking added", 201);
  } catch (error) {
    next(error);
  }
};

const updatePlantStatus = async (req, res, next) => {
  try {
    const plant = await trackingService.updatePlantStatus(req.user.id, req.params.id, req.body);
    logger.info(`Plant tracking updated: ${req.params.id}`);
    return apiResponse.success(res, plant, "Plant status updated");
  } catch (error) {
    next(error);
  }
};

const deleteTracking = async (req, res, next) => {
  try {
    await trackingService.deleteTracking(req.user.id, req.params.id);
    logger.info(`Plant tracking deleted: ${req.params.id}`);
    return apiResponse.success(res, null, "Plant tracking deleted");
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyPlants, getPlantById, addTracking, updatePlantStatus, deleteTracking };
