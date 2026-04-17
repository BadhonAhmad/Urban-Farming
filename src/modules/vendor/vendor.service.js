const prisma = require("../../config/database");

const getMyProfile = async (userId) => {
  const profile = await prisma.vendorProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true } },
      produce: true,
      sustainabilityCert: true,
    },
  });

  if (!profile) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  return profile;
};

const updateProfile = async (userId, data) => {
  const profile = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!profile) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.vendorProfile.update({
    where: { userId },
    data: {
      ...(data.farmName !== undefined && { farmName: data.farmName }),
      ...(data.farmLocation !== undefined && { farmLocation: data.farmLocation }),
    },
    include: {
      user: { select: { name: true, email: true } },
      sustainabilityCert: true,
    },
  });
};

const getAllVendors = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      skip,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        sustainabilityCert: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendorProfile.count(),
  ]);

  return { vendors, total, page, limit };
};

const approveVendor = async (vendorId) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.vendorProfile.update({
    where: { id: vendorId },
    data: { certificationStatus: "APPROVED" },
    include: { user: { select: { name: true, email: true } } },
  });
};

const rejectVendor = async (vendorId) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.vendorProfile.update({
    where: { id: vendorId },
    data: { certificationStatus: "REJECTED" },
    include: { user: { select: { name: true, email: true } } },
  });
};

const submitCertification = async (userId, data) => {
  const profile = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!profile) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const certData = {
    certifyingAgency: data.certifyingAgency,
    certificationDate: new Date(data.certificationDate),
    expiryDate: new Date(data.expiryDate),
    documentUrl: data.documentUrl,
  };

  const cert = await prisma.sustainabilityCert.upsert({
    where: { vendorId: profile.id },
    update: certData,
    create: { vendorId: profile.id, ...certData },
  });

  await prisma.vendorProfile.update({
    where: { id: profile.id },
    data: { certificationStatus: "PENDING" },
  });

  return cert;
};

const approveCertification = async (vendorId) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.vendorProfile.update({
    where: { id: vendorId },
    data: { certificationStatus: "APPROVED" },
    include: { sustainabilityCert: true, user: { select: { name: true, email: true } } },
  });
};

const rejectCertification = async (vendorId) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  if (!vendor) {
    const err = new Error("Vendor not found");
    err.statusCode = 404;
    throw err;
  }

  return prisma.vendorProfile.update({
    where: { id: vendorId },
    data: { certificationStatus: "REJECTED" },
    include: { sustainabilityCert: true, user: { select: { name: true, email: true } } },
  });
};

module.exports = {
  getMyProfile,
  updateProfile,
  getAllVendors,
  approveVendor,
  rejectVendor,
  submitCertification,
  approveCertification,
  rejectCertification,
};
