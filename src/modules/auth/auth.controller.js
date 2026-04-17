const authService = require("./auth.service");
const apiResponse = require("../../utils/apiResponse");
const logger = require("../../utils/logger");

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body, res);
    logger.info(`User registered: ${result.user.email}`);
    return apiResponse.success(res, result, "Registration successful", 201);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, res);
    logger.info(`User logged in: ${email}`);
    return apiResponse.success(res, result, "Login successful");
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    const result = await authService.refreshToken(token, res);
    return apiResponse.success(res, result, "Token refreshed");
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    await authService.logout(token, res);
    logger.info(`User logged out: ${req.user?.email || "unknown"}`);
    return apiResponse.success(res, null, "Logged out");
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

module.exports = { register, login, refreshToken, logout, getProfile };
