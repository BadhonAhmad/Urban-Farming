const vendorService = require("./vendor.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const getAllVendors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await vendorService.getAllVendors(page, limit);
    return apiResponse.paginate(res, result.vendors, result.total, result.page, result.limit, "Vendors fetched");
  } catch (error) {
    next(error);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await vendorService.getMyProfile(req.user.id);
    return apiResponse.success(res, profile, "Profile fetched");
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await vendorService.updateProfile(req.user.id, req.body);
    logger.info(`Vendor profile updated: ${req.user.id}`);
    return apiResponse.success(res, profile, "Profile updated");
  } catch (error) {
    next(error);
  }
};

const approveVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.approveVendor(req.params.vendorId);
    logger.info(`Vendor approved: ${req.params.vendorId}`);
    return apiResponse.success(res, vendor, "Vendor approved");
  } catch (error) {
    next(error);
  }
};

const rejectVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.rejectVendor(req.params.vendorId);
    logger.info(`Vendor rejected: ${req.params.vendorId}`);
    return apiResponse.success(res, vendor, "Vendor rejected");
  } catch (error) {
    next(error);
  }
};

const submitCertification = async (req, res, next) => {
  try {
    const cert = await vendorService.submitCertification(req.user.id, req.body);
    logger.info(`Certification submitted by: ${req.user.id}`);
    return apiResponse.success(res, cert, "Certification submitted", 201);
  } catch (error) {
    next(error);
  }
};

const approveCertification = async (req, res, next) => {
  try {
    const result = await vendorService.approveCertification(req.params.vendorId);
    logger.info(`Certification approved for vendor: ${req.params.vendorId}`);
    return apiResponse.success(res, result, "Certification approved");
  } catch (error) {
    next(error);
  }
};

const rejectCertification = async (req, res, next) => {
  try {
    const result = await vendorService.rejectCertification(req.params.vendorId);
    logger.info(`Certification rejected for vendor: ${req.params.vendorId}`);
    return apiResponse.success(res, result, "Certification rejected");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllVendors,
  getMyProfile,
  updateProfile,
  approveVendor,
  rejectVendor,
  submitCertification,
  approveCertification,
  rejectCertification,
};
