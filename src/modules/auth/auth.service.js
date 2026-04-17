const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../../config/database");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/jwt");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

const issueTokenPair = async (user, res) => {
  const payload = { id: user.id, email: user.email, role: user.role };

  const accessToken = generateAccessToken(payload);
  const rawRefresh = generateRefreshToken(payload);
  const refreshTokenHash = hashToken(rawRefresh);

  const refreshExpiryMs =
    parseInt(process.env.JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60 * 1000 || // "7d" fallback
    7 * 24 * 60 * 60 * 1000;

  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiryMs),
    },
  });

  res.cookie("refreshToken", rawRefresh, REFRESH_COOKIE_OPTIONS);

  return accessToken;
};

const register = async (data, res) => {
  const { name, email, password, role } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role || "CUSTOMER",
      ...(role === "VENDOR" && {
        vendorProfile: {
          create: {
            farmName: "",
            farmLocation: "",
            certificationStatus: "PENDING",
          },
        },
      }),
    },
    include: { vendorProfile: true },
  });

  const accessToken = await issueTokenPair(user, res);

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, accessToken };
};

const login = async (email, password, res) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  if (user.status === "BANNED") {
    const err = new Error("Your account has been banned");
    err.statusCode = 401;
    throw err;
  }

  const accessToken = await issueTokenPair(user, res);

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, accessToken };
};

const refreshToken = async (incomingToken, res) => {
  if (!incomingToken) {
    const err = new Error("Refresh token is required");
    err.statusCode = 401;
    throw err;
  }

  const tokenHash = hashToken(incomingToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) {
    // Token not found — possible reuse with a different hash
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.revokedAt) {
    // Reuse detected — revoke ALL tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.clearCookie("refreshToken", { path: "/api/v1/auth" });
    const err = new Error("Refresh token reuse detected — all sessions revoked");
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.expiresAt < new Date()) {
    const err = new Error("Refresh token expired");
    err.statusCode = 401;
    throw err;
  }

  // Revoke current token (rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // Issue new pair
  const accessToken = await issueTokenPair(storedToken.user, res);

  const { password: _, ...userWithoutPassword } = storedToken.user;
  return { user: userWithoutPassword, accessToken };
};

const logout = async (incomingToken, res) => {
  if (!incomingToken) {
    res.clearCookie("refreshToken", { path: "/api/v1/auth" });
    return;
  }

  const tokenHash = hashToken(incomingToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  res.clearCookie("refreshToken", { path: "/api/v1/auth" });
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendorProfile: true },
  });

  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

module.exports = { register, login, refreshToken, logout, getProfile };
