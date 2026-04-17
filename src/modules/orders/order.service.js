const prisma = require("../../config/database");

const createOrder = async (userId, data) => {
  const produce = await prisma.produce.findUnique({
    where: { id: data.produceId },
    include: { vendor: true },
  });

  if (!produce) {
    const err = new Error("Produce not found");
    err.statusCode = 404;
    throw err;
  }

  if (produce.certificationStatus !== "APPROVED") {
    const err = new Error("This produce is not available for ordering");
    err.statusCode = 400;
    throw err;
  }

  if (produce.availableQuantity < data.quantity) {
    const err = new Error(`Only ${produce.availableQuantity} items available`);
    err.statusCode = 400;
    throw err;
  }

  const totalPrice = Number(produce.price) * data.quantity;

  return prisma.$transaction(async (tx) => {
    await tx.produce.update({
      where: { id: data.produceId },
      data: { availableQuantity: { decrement: data.quantity } },
    });

    return tx.order.create({
      data: {
        userId,
        produceId: data.produceId,
        vendorId: produce.vendorId,
        quantity: data.quantity,
        totalPrice,
        status: "PENDING",
      },
      include: {
        produce: { select: { name: true, category: true } },
        vendor: { select: { farmName: true, farmLocation: true } },
      },
    });
  });
};

const getMyOrders = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        produce: { select: { name: true, category: true, price: true } },
        vendor: { select: { farmName: true, farmLocation: true } },
      },
      orderBy: { orderDate: "desc" },
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return { orders, total, page, limit };
};

const getVendorOrders = async (userId, page = 1, limit = 10) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
  if (!vendor) {
    const err = new Error("Vendor profile not found");
    err.statusCode = 404;
    throw err;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { vendorId: vendor.id },
      skip,
      take: limit,
      include: {
        produce: { select: { name: true, category: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { orderDate: "desc" },
    }),
    prisma.order.count({ where: { vendorId: vendor.id } }),
  ]);

  return { orders, total, page, limit };
};

const getAllOrders = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      skip,
      take: limit,
      include: {
        produce: { select: { name: true, category: true } },
        user: { select: { name: true, email: true } },
        vendor: { select: { farmName: true, farmLocation: true } },
      },
      orderBy: { orderDate: "desc" },
    }),
    prisma.order.count(),
  ]);

  return { orders, total, page, limit };
};

const getOrderById = async (orderId, userId, role) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      produce: { select: { name: true, category: true, price: true } },
      user: { select: { name: true, email: true } },
      vendor: { select: { farmName: true, farmLocation: true } },
    },
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (role === "ADMIN") return order;

  if (role === "CUSTOMER" && order.userId !== userId) {
    const err = new Error("You can only view your own orders");
    err.statusCode = 403;
    throw err;
  }

  if (role === "VENDOR") {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || order.vendorId !== vendor.id) {
      const err = new Error("You can only view orders for your produce");
      err.statusCode = 403;
      throw err;
    }
  }

  return order;
};

const updateOrderStatus = async (orderId, status, userId, role) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const validTransitions = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    const err = new Error(`Cannot transition order from ${order.status} to ${status}`);
    err.statusCode = 400;
    throw err;
  }

  if (role === "CUSTOMER") {
    if (status !== "CANCELLED") {
      const err = new Error("Customers can only cancel orders");
      err.statusCode = 403;
      throw err;
    }
    if (order.userId !== userId) {
      const err = new Error("You can only cancel your own orders");
      err.statusCode = 403;
      throw err;
    }
    if (order.status !== "PENDING") {
      const err = new Error("Only pending orders can be cancelled");
      err.statusCode = 400;
      throw err;
    }
  }

  if (role === "VENDOR") {
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor || order.vendorId !== vendor.id) {
      const err = new Error("You can only update orders for your own produce");
      err.statusCode = 403;
      throw err;
    }
  }

  if (status === "CANCELLED") {
    return prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          produce: { select: { name: true } },
          vendor: { select: { farmName: true } },
        },
      }),
      prisma.produce.update({
        where: { id: order.produceId },
        data: { availableQuantity: { increment: order.quantity } },
      }),
    ]);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      produce: { select: { name: true } },
      vendor: { select: { farmName: true } },
    },
  });
};

module.exports = {
  createOrder,
  getMyOrders,
  getVendorOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
