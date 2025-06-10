const prisma = require("../config/db");
const { validationResult } = require("express-validator");

// Funkcja tworzenia kategorii (pozostaje bez zmian, ale wklejona dla kompletności)
exports.createCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const userIdFromHeader = req.headers["x-user-id"];
  if (!userIdFromHeader) {
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
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A category with this name already exists for this user.",
      });
    }
    next(error);
  }
};

// Połączona i poprawiona funkcja do pobierania kategorii
exports.getCategories = async (req, res, next) => {
  const { id } = req.query;
  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");

  if (!userIdAuth) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  try {
    if (id) {
      const category = await prisma.category.findUnique({ where: { id } });
      if (!category) {
        return res.status(404).json({ message: "Category not found." });
      }
      if (!isAdmin && category.userId !== userIdAuth) {
        return res.status(403).json({
          message: "Forbidden: You do not have access to this category.",
        });
      }
      return res.status(200).json(category);
    }

    let queryUserId = userIdAuth;
    if (isAdmin && req.query.userId) {
      queryUserId = req.query.userId;
    }

    const categories = await prisma.category.findMany({
      where: { userId: queryUserId },
      orderBy: { name: "asc" },
    });
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

// Zaktualizowana funkcja do edycji kategorii
exports.updateCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  const { id, name } = req.body;

  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const categoryToUpdate = await prisma.category.findFirst({
      where: { id: id, userId: userIdAuth },
    });

    if (!categoryToUpdate) {
      return res.status(404).json({
        message:
          "Category not found or you do not have permission to update it.",
      });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: id },
      data: { name },
    });
    res.status(200).json(updatedCategory);
  } catch (error) {
    if (error.code === "P2002") {
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

// Zaktualizowana funkcja do usuwania kategorii
exports.deleteCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  const { id } = req.body;

  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const categoryToDelete = await prisma.category.findFirst({
      where: { id: id, userId: userIdAuth },
    });

    if (!categoryToDelete) {
      return res.status(404).json({
        message:
          "Category not found or you do not have permission to delete it.",
      });
    }

    await prisma.category.delete({ where: { id } });
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
