const prisma = require("../../config/database");
const cache = require("../../utils/cache");

const createProduce = async (userId, data) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const result = await prisma.produce.create({
    data: {
      vendorId: vendor.id,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      availableQuantity: data.availableQuantity,
      certificationStatus: "PENDING",
    },
    include: {
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  await cache.del("produce:*");
  return result;
};

const getProduceList = async (filters, page = 1, limit = 10) => {
  const category = filters.category || "all";
  const key = `produce:list:APPROVED:${category}:${page}:${limit}`;

  return cache.wrap(key, 300, async () => {
    const skip = (page - 1) * limit;

    const where = {
      certificationStatus: "APPROVED",
      ...(filters.category && { category: { contains: filters.category, mode: "insensitive" } }),
    };

    const [produce, total] = await Promise.all([
      prisma.produce.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: { select: { farmName: true, farmLocation: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.produce.count({ where }),
    ]);

    return { produce, total, page, limit };
  });
};

const getProduceById = async (id) => {
  return cache.wrap(`produce:${id}`, 300, async () => {
    const produce = await prisma.produce.findUnique({
      where: { id },
      include: {
        vendor: { select: { farmName: true, farmLocation: true, certificationStatus: true } },
      },
    });

    if (!produce) {
      const err = new Error("Produce not found");
      err.statusCode = 404;
      throw err;
    }

    return produce;
  });
};

const updateProduce = async (userId, produceId, data) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const produce = await prisma.produce.findUnique({ where: { id: produceId } });
  if (!produce) {
    const err = new Error("Produce not found");
    err.statusCode = 404;
    throw err;
  }

  if (produce.vendorId !== vendor.id) {
    const err = new Error("You can only update your own produce");
    err.statusCode = 403;
    throw err;
  }

  const result = await prisma.produce.update({
    where: { id: produceId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.availableQuantity !== undefined && { availableQuantity: data.availableQuantity }),
    },
    include: {
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  await cache.del("produce:*");
  return result;
};

const deleteProduce = async (userId, produceId, role) => {
  const produce = await prisma.produce.findUnique({ where: { id: produceId } });
  if (!produce) {
    const err = new Error("Produce not found");
    err.statusCode = 404;
    throw err;
  }

  if (role !== "ADMIN") {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || produce.vendorId !== vendor.id) {
      const err = new Error("You can only delete your own produce");
      err.statusCode = 403;
      throw err;
    }
  }

  await prisma.produce.delete({ where: { id: produceId } });
  await cache.del("produce:*");
  return { id: produceId };
};

const approveProduce = async (produceId) => {
  const produce = await prisma.produce.findUnique({ where: { id: produceId } });
  if (!produce) {
    const err = new Error("Produce not found");
    err.statusCode = 404;
    throw err;
  }

  const result = await prisma.produce.update({
    where: { id: produceId },
    data: { certificationStatus: "APPROVED" },
    include: {
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  await cache.del("produce:*");
  return result;
};

const rejectProduce = async (produceId) => {
  const produce = await prisma.produce.findUnique({ where: { id: produceId } });
  if (!produce) {
    const err = new Error("Produce not found");
    err.statusCode = 404;
    throw err;
  }

  const result = await prisma.produce.update({
    where: { id: produceId },
    data: { certificationStatus: "REJECTED" },
    include: {
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  await cache.del("produce:*");
  return result;
};

const getMyProduce = async (userId, page = 1, limit = 10) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const key = `produce:vendor:${vendor.id}:${page}:${limit}`;

  return cache.wrap(key, 120, async () => {
    const skip = (page - 1) * limit;

    const [produce, total] = await Promise.all([
      prisma.produce.findMany({
        where: { vendorId: vendor.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.produce.count({ where: { vendorId: vendor.id } }),
    ]);

    return { produce, total, page, limit };
  });
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
