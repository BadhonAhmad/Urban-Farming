const prisma = require("../../config/database");

const createPost = async (userId, data) => {
  return prisma.communityPost.create({
    data: {
      userId,
      title: data.title,
      postContent: data.postContent,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
};

const getPosts = async (page = 1, limit = 10, search = "") => {
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { postContent: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [posts, total] = await Promise.all([
    prisma.communityPost.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { postDate: "desc" },
    }),
    prisma.communityPost.count({ where }),
  ]);

  return { posts, total, page, limit };
};

const getPostById = async (id) => {
  const post = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  return post;
};

const updatePost = async (userId, postId, data, role) => {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId && role !== "ADMIN") {
    const err = new Error("You can only update your own posts");
    err.statusCode = 403;
    throw err;
  }

  return prisma.communityPost.update({
    where: { id: postId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.postContent !== undefined && { postContent: data.postContent }),
    },
    include: {
      user: { select: { name: true } },
    },
  });
};

const deletePost = async (userId, postId, role) => {
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) {
    const err = new Error("Post not found");
    err.statusCode = 404;
    throw err;
  }

  if (post.userId !== userId && role !== "ADMIN") {
    const err = new Error("You can only delete your own posts");
    err.statusCode = 403;
    throw err;
  }

  await prisma.communityPost.delete({ where: { id: postId } });
  return { id: postId };
};

module.exports = { createPost, getPosts, getPostById, updatePost, deletePost };
