const prisma = require("../config/db");
const { validationResult } = require("express-validator");
const { TaskPriority, TaskStatus } = require("@prisma/client");

exports.createTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdFromHeader = req.headers["x-user-id"];
  if (!userIdFromHeader) {
    console.error(
      "CRITICAL: X-User-ID header missing in request to tasks-service (createTask)."
    );
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  const {
    title,
    description,
    priority,
    status,
    dueDate,
    categoryId,
    newCategoryName,
  } = req.body;

  try {
    await prisma.user.upsert({
      where: { id: userIdFromHeader },
      update: {},
      create: { id: userIdFromHeader },
    });

    let taskData = {
      title,
      description,
      priority: priority || TaskPriority.MEDIUM,
      status: status || TaskStatus.TODO,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: userIdFromHeader,
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
            userId: userIdFromHeader,
          },
        });
        taskData.categoryId = newCategory.id;
        const task = await tx.task.create({
          data: taskData,
          include: { category: true },
        });
        return task;
      });
    } else {
      createdTask = await prisma.task.create({
        data: taskData,
        include: { category: true },
      });
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

exports.getAllTasks = async (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");

  let targetUserIdQuery = req.query.userId; // Dla admina, aby mógł filtrować po userId

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  const {
    status,
    priority,
    categoryId,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const where = {};
  if (isAdmin && targetUserIdQuery) {
    where.userId = targetUserIdQuery;
  } else {
    where.userId = userId; // Zwykły użytkownik widzi tylko swoje
  }

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

exports.getTaskById = async (req, res, next) => {
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
    const task = await prisma.task.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!isAdmin && task.userId !== userIdAuth) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this task." });
    }
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
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
  const { title, description, priority, status, dueDate, categoryId } =
    req.body;
  try {
    const taskToUpdate = await prisma.task.findUnique({ where: { id } });

    if (!taskToUpdate) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!isAdmin && taskToUpdate.userId !== userIdAuth) {
      return res.status(403).json({
        message: "Forbidden: You do not own this task and cannot update it.",
      });
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
    if (error.code === "P2025") {
      return res.status(404).json({
        message:
          "Failed to update task. Related record not found (e.g. category).",
      });
    }
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
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
    const taskToDelete = await prisma.task.findUnique({ where: { id } });

    if (!taskToDelete) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!isAdmin && taskToDelete.userId !== userIdAuth) {
      return res.status(403).json({
        message: "Forbidden: You do not own this task and cannot delete it.",
      });
    }

    await prisma.task.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Task not found or already deleted." });
    }
    next(error);
  }
};
