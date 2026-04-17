const authService = require("./auth.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    logger.info(`User registered: ${user.email}`);
    return apiResponse.success(res, user, "Registration successful", 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    logger.info(`User logged in: ${email}`);
    return apiResponse.success(res, result, "Login successful");
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user.id);
    return apiResponse.success(res, profile, "Profile fetched");
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile };
