const prisma = require("../config/database");
const { verifyToken } = require("../utils/jwt");
const apiResponse = require("../utils/apiResponse");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiResponse.error(res, "Authorization token is required", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return apiResponse.error(res, "User not found", 401);
    }

    if (user.status === "BANNED") {
      return apiResponse.error(res, "Your account has been banned", 401);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    return apiResponse.error(res, "Invalid or expired token", 401);
  }
};

module.exports = authenticate;
