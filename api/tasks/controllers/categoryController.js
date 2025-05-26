const prisma = require("../config/db");
const { validationResult } = require("express-validator");

exports.createCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdFromHeader = req.headers["x-user-id"];
  if (!userIdFromHeader) {
    console.error(
      "CRITICAL: X-User-ID header missing in request to tasks-service (createCategory)."
    );
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  const { name } = req.body;

  try {
    await prisma.user.upsert({
      where: { id: userIdFromHeader },
      update: {},
      create: { id: userIdFromHeader },
    });

    const category = await prisma.category.create({
      data: {
        name,
        userId: userIdFromHeader,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("name") &&
      error.meta?.target?.includes("userId")
    ) {
      return res.status(409).json({
        message: "Category with this name already exists for this user.",
      });
    }
    next(error);
  }
};

exports.getCategoriesByUser = async (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");
  let targetUserId = req.params.userId;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  let queryUserId = userId;

  if (isAdmin && targetUserId) {
    queryUserId = targetUserId;
  } else if (targetUserId && targetUserId !== userId && !isAdmin) {
    return res.status(403).json({
      message: "Forbidden: You can only view your own categories.",
    });
  }

  try {
    const categories = await prisma.category.findMany({
      where: { userId: queryUserId },
      orderBy: { name: "asc" },
    });
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");

  if (!userIdAuth) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  const { id } = req.params;
  const { name } = req.body;
  try {
    const categoryToUpdate = await prisma.category.findUnique({
      where: { id },
    });

    if (!categoryToUpdate) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!isAdmin && categoryToUpdate.userId !== userIdAuth) {
      return res.status(403).json({
        message:
          "Forbidden: You do not own this category and cannot update it.",
      });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name },
    });
    res.status(200).json(updatedCategory);
  } catch (error) {
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("name") &&
      error.meta?.target?.includes("userId")
    ) {
      return res.status(409).json({
        message:
          "Another category with this name already exists for this user.",
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Category not found for update." });
    }
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");

  if (!userIdAuth) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  const { id } = req.params;

  try {
    const categoryToDelete = await prisma.category.findUnique({
      where: { id },
    });

    if (!categoryToDelete) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!isAdmin && categoryToDelete.userId !== userIdAuth) {
      return res.status(403).json({
        message:
          "Forbidden: You do not own this category and cannot delete it.",
      });
    }

    await prisma.category.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Category not found or already deleted." });
    }
    next(error);
  }
};
