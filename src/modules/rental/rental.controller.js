const rentalService = require("./rental.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const createRentalSpace = async (req, res, next) => {
  try {
    const space = await rentalService.createRentalSpace(req.user.id, req.body);
    logger.info(`Rental space created: ${space.id}`);
    return apiResponse.success(res, space, "Rental space created", 201);
  } catch (error) {
    next(error);
  }
};

const getRentalSpaces = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
      location: req.query.location,
      isAvailable: req.query.isAvailable,
    };
    const result = await rentalService.getRentalSpaces(filters, page, limit);
    return apiResponse.paginate(res, result.spaces, result.total, result.page, result.limit, "Rental spaces fetched");
  } catch (error) {
    next(error);
  }
};

const getRentalSpaceById = async (req, res, next) => {
  try {
    const space = await rentalService.getRentalSpaceById(req.params.id);
    return apiResponse.success(res, space, "Rental space fetched");
  } catch (error) {
    next(error);
  }
};

const updateRentalSpace = async (req, res, next) => {
  try {
    const space = await rentalService.updateRentalSpace(req.user.id, req.params.id, req.body);
    logger.info(`Rental space updated: ${req.params.id}`);
    return apiResponse.success(res, space, "Rental space updated");
  } catch (error) {
    next(error);
  }
};

const deleteRentalSpace = async (req, res, next) => {
  try {
    await rentalService.deleteRentalSpace(req.user.id, req.params.id);
    logger.info(`Rental space deleted: ${req.params.id}`);
    return apiResponse.success(res, null, "Rental space deleted");
  } catch (error) {
    next(error);
  }
};

const bookRentalSpace = async (req, res, next) => {
  try {
    const booking = await rentalService.bookRentalSpace(req.user.id, {
      spaceId: req.params.id,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    });
    logger.info(`Booking created: ${booking.id} for space ${req.params.id}`);
    return apiResponse.success(res, booking, "Booking created", 201);
  } catch (error) {
    next(error);
  }
};

const confirmBooking = async (req, res, next) => {
  try {
    const result = await rentalService.confirmBooking(req.params.bookingId, req.user.id, req.user.role);
    logger.info(`Booking confirmed: ${req.params.bookingId}`);
    return apiResponse.success(res, result, "Booking confirmed");
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const result = await rentalService.cancelBooking(req.params.bookingId, req.user.id, req.user.role);
    logger.info(`Booking cancelled: ${req.params.bookingId}`);
    return apiResponse.success(res, result, "Booking cancelled");
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await rentalService.getMyBookings(req.user.id, page, limit);
    return apiResponse.paginate(res, result.bookings, result.total, result.page, result.limit, "My bookings fetched");
  } catch (error) {
    next(error);
  }
};

const getVendorBookings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = await rentalService.getVendorBookings(req.user.id, page, limit);
    return apiResponse.paginate(res, result.bookings, result.total, result.page, result.limit, "Vendor bookings fetched");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRentalSpace,
  getRentalSpaces,
  getRentalSpaceById,
  updateRentalSpace,
  deleteRentalSpace,
  bookRentalSpace,
  confirmBooking,
  cancelBooking,
  getMyBookings,
  getVendorBookings,
};
