const prisma = require("../../config/database");

const addTracking = async (userId, data) => {
  const space = await prisma.rentalSpace.findUnique({
    where: { id: data.rentalSpaceId },
    include: { rentalBookings: { where: { userId, status: "CONFIRMED" } } },
  });

  if (!space) {
    const err = new Error("Rental space not found");
    err.statusCode = 404;
    throw err;
  }

  if (space.rentalBookings.length === 0) {
    const err = new Error("You must have a confirmed booking for this space to add plant tracking");
    err.statusCode = 403;
    throw err;
  }

  return prisma.plantTracking.create({
    data: {
      userId,
      rentalSpaceId: data.rentalSpaceId,
      plantName: data.plantName,
      growthStage: data.growthStage,
      healthStatus: data.healthStatus,
      notes: data.notes || null,
    },
    include: {
      rentalSpace: { select: { location: true, size: true } },
    },
  });
};

const getMyPlants = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [plants, total] = await Promise.all([
    prisma.plantTracking.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        rentalSpace: { select: { location: true, size: true } },
      },
      orderBy: { lastUpdated: "desc" },
    }),
    prisma.plantTracking.count({ where: { userId } }),
  ]);

  return { plants, total, page, limit };
};

const getPlantById = async (userId, trackingId) => {
  const plant = await prisma.plantTracking.findUnique({
    where: { id: trackingId },
    include: {
      rentalSpace: { select: { location: true, size: true } },
    },
  });

  if (!plant) {
    const err = new Error("Plant tracking record not found");
    err.statusCode = 404;
    throw err;
  }

  if (plant.userId !== userId) {
    const err = new Error("You can only view your own plant records");
    err.statusCode = 403;
    throw err;
  }

  return plant;
};

const updatePlantStatus = async (userId, trackingId, data) => {
  const plant = await prisma.plantTracking.findUnique({ where: { id: trackingId } });
  if (!plant) {
    const err = new Error("Plant tracking record not found");
    err.statusCode = 404;
    throw err;
  }

  if (plant.userId !== userId) {
    const err = new Error("You can only update your own plant records");
    err.statusCode = 403;
    throw err;
  }

  return prisma.plantTracking.update({
    where: { id: trackingId },
    data: {
      ...(data.growthStage !== undefined && { growthStage: data.growthStage }),
      ...(data.healthStatus !== undefined && { healthStatus: data.healthStatus }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: {
      rentalSpace: { select: { location: true, size: true } },
    },
  });
};

const deleteTracking = async (userId, trackingId) => {
  const plant = await prisma.plantTracking.findUnique({ where: { id: trackingId } });
  if (!plant) {
    const err = new Error("Plant tracking record not found");
    err.statusCode = 404;
    throw err;
  }

  if (plant.userId !== userId) {
    const err = new Error("You can only delete your own plant records");
    err.statusCode = 403;
    throw err;
  }

  await prisma.plantTracking.delete({ where: { id: trackingId } });
  return { id: trackingId };
};

module.exports = { addTracking, getMyPlants, getPlantById, updatePlantStatus, deleteTracking };
