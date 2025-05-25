const prisma = require("../config/db");
const { validationResult } = require("express-validator");

exports.createCategory = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // W tymczasowym rozwiązaniu, jeśli User nie istnieje, możemy go stworzyć
      // W docelowym rozwiązaniu ten błąd oznaczałby problem z ID usera z tokenu JWT
      await prisma.user.create({ data: { id: userId } });
      console.log(
        `Temporary user created with ID: ${userId} for category creation.`
      );
      // return res.status(404).json({ message: `User with ID ${userId} not found.` });
    }

    const category = await prisma.category.create({
      data: {
        name,
        userId,
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
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "User ID is required to fetch categories." });
  }

  try {
    const categories = await prisma.category.findMany({
      where: { userId: userId },
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
  const { id } = req.params;
  const { name, userId } = req.body;

  try {
    const categoryToUpdate = await prisma.category.findUnique({
      where: { id },
    });
    if (!categoryToUpdate) {
      return res.status(404).json({ message: "Category not found" });
    }
    // W przyszłości weryfikacja, czy req.user.id === categoryToUpdate.userId
    if (userId && categoryToUpdate.userId !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to update this category" });
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
    next(error);
  }
};

// Usuń kategorię
exports.deleteCategory = async (req, res, next) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const categoryToDelete = await prisma.category.findUnique({
      where: { id },
    });
    if (!categoryToDelete) {
      return res.status(404).json({ message: "Category not found" });
    }
    // W przyszłości weryfikacja, czy req.user.id === categoryToDelete.userId
    if (userId && categoryToDelete.userId !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to delete this category" });
    }

    await prisma.category.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
