const prisma = require("../config/db");
const { validationResult } = require("express-validator");
const { TaskPriority, TaskStatus } = require("@prisma/client");

// Utwórz nowe zadanie
exports.createTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    title,
    description,
    priority,
    status,
    dueDate,
    userId,
    categoryId,
    newCategoryName,
  } = req.body;

  try {
    // Symulacja istnienia użytkownika - w pełnym systemie byłby z tokenu JWT
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId /*, email: `${userId}@example.com` */ },
      });
      console.log(`Temporary user created with ID: ${userId}`);
    }

    let taskData = {
      title,
      description,
      priority: priority || TaskPriority.MEDIUM,
      status: status || TaskStatus.TODO,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: user.id,
    };

    if (categoryId) {
      taskData.categoryId = categoryId;
    }

    let createdTask;

    if (newCategoryName && !categoryId) {
      createdTask = await prisma.$transaction(async (tx) => {
        const newCategory = await tx.category.create({
          data: {
            name: newCategoryName,
            userId: user.id,
          },
        });
        console.log("New category created in transaction:", newCategory.name);

        taskData.categoryId = newCategory.id;
        const task = await tx.task.create({
          data: taskData,
          include: { category: true },
        });
        return task;
      });
      console.log(
        "Task and new category created successfully in a transaction."
      );
    } else {
      createdTask = await prisma.task.create({
        data: taskData,
        include: { category: true },
      });
      console.log("Task created successfully.");
    }

    res.status(201).json(createdTask);
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
    if (error.code === "P2003") {
      if (error.meta?.field_name?.includes("categoryId")) {
        return res
          .status(400)
          .json({ message: "Invalid categoryId. Category does not exist." });
      }
    }
    next(error);
  }
};

exports.getAllTasks = async (req, res, next) => {
  // Na razie userId z query, docelowo z req.user.id
  const {
    userId,
    status,
    priority,
    categoryId,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;

  try {
    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

// Pobierz zadanie po ID
exports.getTaskById = async (req, res, next) => {
  const { id } = req.params;
  // const userId = req.user.id // Docelowo do sprawdzania uprawnień
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    // if (task.userId !== userId) return res.status(403).json({ message: 'Forbidden' });
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

// Zaktualizuj zadanie
exports.updateTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { id } = req.params;
  // const currentUserId = req.user.id; // Docelowo
  const { title, description, priority, status, dueDate, categoryId, userId } =
    req.body;

  try {
    const taskToUpdate = await prisma.task.findUnique({ where: { id } });
    if (!taskToUpdate) {
      return res.status(404).json({ message: "Task not found" });
    }
    // Weryfikacja uprawnień (na razie prosta, na podstawie userId z body)
    if (userId && taskToUpdate.userId !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to update this task" });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        categoryId,
      },
      include: { category: true },
    });
    res.status(200).json(updatedTask);
  } catch (error) {
    if (
      error.code === "P2003" &&
      error.meta?.field_name?.includes("categoryId")
    ) {
      return res
        .status(400)
        .json({ message: "Invalid categoryId. Category does not exist." });
    }
    next(error);
  }
};

// Usuń zadanie
exports.deleteTask = async (req, res, next) => {
  const { id } = req.params;
  // const currentUserId = req.user.id; // Docelowo
  const { userId } = req.body; // userId do weryfikacji właściciela

  try {
    const taskToDelete = await prisma.task.findUnique({ where: { id } });
    if (!taskToDelete) {
      return res.status(404).json({ message: "Task not found" });
    }
    // Weryfikacja uprawnień (na razie prosta)
    if (userId && taskToDelete.userId !== userId) {
      return res
        .status(403)
        .json({ message: "User not authorized to delete this task" });
    }

    await prisma.task.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
