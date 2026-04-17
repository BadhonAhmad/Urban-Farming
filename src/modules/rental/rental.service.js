const prisma = require("../../config/database");
const cache = require("../../utils/cache");

const createRentalSpace = async (userId, data) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const result = await prisma.rentalSpace.create({
    data: {
      vendorId: vendor.id,
      location: data.location,
      size: data.size,
      pricePerDay: data.pricePerDay,
    },
    include: {
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  await cache.del("rentals:*");
  return result;
};

const getRentalSpaces = async (filters, page = 1, limit = 10) => {
  const location = filters.location || "all";
  const available = filters.isAvailable || "all";
  const key = `rentals:list:${location}:${available}:${page}:${limit}`;

  return cache.wrap(key, 300, async () => {
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.location && { location: { contains: filters.location, mode: "insensitive" } }),
      ...(filters.isAvailable !== undefined && { isAvailable: filters.isAvailable === "true" }),
    };

    const [spaces, total] = await Promise.all([
      prisma.rentalSpace.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: { select: { farmName: true, farmLocation: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rentalSpace.count({ where }),
    ]);

    return { spaces, total, page, limit };
  });
};

const getRentalSpaceById = async (id) => {
  return cache.wrap(`rentals:${id}`, 300, async () => {
    const space = await prisma.rentalSpace.findUnique({
      where: { id },
      include: {
        vendor: { select: { farmName: true, farmLocation: true, certificationStatus: true } },
      },
    });

    if (!space) {
      const err = new Error("Rental space not found");
      err.statusCode = 404;
      throw err;
    }

    return space;
  });
};

const updateRentalSpace = async (userId, spaceId, data) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const space = await prisma.rentalSpace.findUnique({ where: { id: spaceId } });
  if (!space) {
    const err = new Error("Rental space not found");
    err.statusCode = 404;
    throw err;
  }

  if (space.vendorId !== vendor.id) {
    const err = new Error("You can only update your own rental spaces");
    err.statusCode = 403;
    throw err;
  }

  const result = await prisma.rentalSpace.update({
    where: { id: spaceId },
    data: {
      ...(data.location !== undefined && { location: data.location }),
      ...(data.size !== undefined && { size: data.size }),
      ...(data.pricePerDay !== undefined && { pricePerDay: data.pricePerDay }),
    },
    include: {
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  await cache.del("rentals:*");
  return result;
};

const deleteRentalSpace = async (userId, spaceId) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const space = await prisma.rentalSpace.findUnique({ where: { id: spaceId } });
  if (!space) {
    const err = new Error("Rental space not found");
    err.statusCode = 404;
    throw err;
  }

  if (space.vendorId !== vendor.id) {
    const err = new Error("You can only delete your own rental spaces");
    err.statusCode = 403;
    throw err;
  }

  await prisma.rentalSpace.delete({ where: { id: spaceId } });
  await cache.del("rentals:*");
  await cache.del("bookings:*");
  return { id: spaceId };
};

const bookRentalSpace = async (userId, data) => {
  const space = await prisma.rentalSpace.findUnique({ where: { id: data.spaceId } });
  if (!space) {
    const err = new Error("Rental space not found");
    err.statusCode = 404;
    throw err;
  }

  if (!space.isAvailable) {
    const err = new Error("This rental space is not available");
    err.statusCode = 400;
    throw err;
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (endDate <= startDate) {
    const err = new Error("End date must be after start date");
    err.statusCode = 400;
    throw err;
  }

  const diffMs = endDate - startDate;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const totalPrice = Number(space.pricePerDay) * days;

  const result = await prisma.rentalBooking.create({
    data: {
      userId,
      rentalSpaceId: data.spaceId,
      startDate,
      endDate,
      status: "PENDING",
      totalPrice,
    },
    include: {
      rentalSpace: {
        include: { vendor: { select: { farmName: true, farmLocation: true } } },
      },
    },
  });

  await cache.del("bookings:*");
  return result;
};

const confirmBooking = async (bookingId, userId, role) => {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    include: { rentalSpace: true },
  });
  if (!booking) {
    const err = new Error("Booking not found");
    err.statusCode = 404;
    throw err;
  }

  if (role === "VENDOR") {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || booking.rentalSpace.vendorId !== vendor.id) {
      const err = new Error("You can only confirm bookings on your own spaces");
      err.statusCode = 403;
      throw err;
    }
  }

  const result = await prisma.$transaction([
    prisma.rentalBooking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    }),
    prisma.rentalSpace.update({
      where: { id: booking.rentalSpaceId },
      data: { isAvailable: false },
    }),
  ]);

  await cache.del("rentals:*");
  await cache.del("bookings:*");
  return result;
};

const cancelBooking = async (bookingId, userId, role) => {
  const booking = await prisma.rentalBooking.findUnique({
    where: { id: bookingId },
    include: { rentalSpace: true },
  });
  if (!booking) {
    const err = new Error("Booking not found");
    err.statusCode = 404;
    throw err;
  }

  const isCustomer = booking.userId === userId;
  const isVendor = await (async () => {
    if (role === "VENDOR") {
      const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
      return vendor && booking.rentalSpace.vendorId === vendor.id;
    }
    return false;
  })();
  const isAdmin = role === "ADMIN";

  if (!isCustomer && !isVendor && !isAdmin) {
    const err = new Error("You are not authorized to cancel this booking");
    err.statusCode = 403;
    throw err;
  }

  const result = await prisma.$transaction([
    prisma.rentalBooking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    }),
    prisma.rentalSpace.update({
      where: { id: booking.rentalSpaceId },
      data: { isAvailable: true },
    }),
  ]);

  await cache.del("rentals:*");
  await cache.del("bookings:*");
  return result;
};

const getMyBookings = async (userId, page = 1, limit = 10) => {
  const key = `bookings:user:${userId}:${page}:${limit}`;

  return cache.wrap(key, 120, async () => {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.rentalBooking.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          rentalSpace: {
            include: { vendor: { select: { farmName: true, farmLocation: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rentalBooking.count({ where: { userId } }),
    ]);

    return { bookings, total, page, limit };
  });
};

const getVendorBookings = async (userId, page = 1, limit = 10) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const key = `bookings:vendor:${vendor.id}:${page}:${limit}`;

  return cache.wrap(key, 120, async () => {
    const skip = (page - 1) * limit;
    const spaceIds = (await prisma.rentalSpace.findMany({
      where: { vendorId: vendor.id },
      select: { id: true },
    })).map((s) => s.id);

    const [bookings, total] = await Promise.all([
      prisma.rentalBooking.findMany({
        where: { rentalSpaceId: { in: spaceIds } },
        skip,
        take: limit,
        include: {
          rentalSpace: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rentalBooking.count({ where: { rentalSpaceId: { in: spaceIds } } }),
    ]);

    return { bookings, total, page, limit };
  });
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
