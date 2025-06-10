const prisma = require("../config/db");
const { validationResult } = require("express-validator");
const { TaskPriority, TaskStatus, ProjectRole } = require("@prisma/client");

// Funkcja tworzenia zadania (pozostaje bez zmian, ale wklejona dla kompletności)
exports.createTask = async (req, res, next) => {
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
  const {
    title,
    description,
    priority,
    status,
    dueDate,
    categoryId,
    newCategoryName,
    projectId,
  } = req.body;
  try {
    await prisma.user.upsert({
      where: { id: userIdFromHeader },
      update: {},
      create: { id: userIdFromHeader },
    });

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res
          .status(404)
          .json({ message: `Project with ID ${projectId} not found.` });
      }
      const projectMembership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: userIdFromHeader } },
      });
      const canCreateTaskInProject =
        (projectMembership &&
          [ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.MEMBER].includes(
            projectMembership.role
          )) ||
        project.ownerId === userIdFromHeader;
      const userRoles = (req.headers["x-user-roles"] || "").split(",");
      const isAdmin = userRoles.includes("admin");

      if (!isAdmin && !canCreateTaskInProject) {
        return res.status(403).json({
          message:
            "Forbidden: You do not have permission to create tasks in this project.",
        });
      }
    }

    let taskData = {
      title,
      description,
      priority: priority || TaskPriority.MEDIUM,
      status: status || TaskStatus.TODO,
      dueDate: dueDate ? new Date(dueDate) : null,
      userId: userIdFromHeader,
    };
    if (categoryId) taskData.categoryId = categoryId;
    if (projectId) taskData.projectId = projectId;

    let createdTask;
    if (newCategoryName && !categoryId) {
      createdTask = await prisma.$transaction(async (tx) => {
        const newCategory = await tx.category.create({
          data: { name: newCategoryName, userId: userIdFromHeader },
        });
        taskData.categoryId = newCategory.id;
        const task = await tx.task.create({
          data: taskData,
          include: { category: true, project: true },
        });
        return task;
      });
    } else {
      createdTask = await prisma.task.create({
        data: taskData,
        include: { category: true, project: true },
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
        message: "A category with this name already exists for this user.",
      });
    }
    if (error.code === "P2003") {
      if (error.meta?.field_name?.includes("categoryId")) {
        return res
          .status(400)
          .json({ message: "Invalid categoryId. Category does not exist." });
      }
      if (error.meta?.field_name?.includes("projectId")) {
        return res
          .status(400)
          .json({ message: "Invalid projectId. Project does not exist." });
      }
    }
    next(error);
  }
};

// Połączona i poprawiona funkcja do pobierania zadań
exports.getTasks = async (req, res, next) => {
  const { id, ...filters } = req.query;
  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");

  if (!userIdAuth) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }

  try {
    // Logika dla pobierania jednego zadania po ID
    if (id) {
      const task = await prisma.task.findUnique({
        where: { id },
        include: { category: true, project: { include: { members: true } } },
      });

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      let canAccess = false;
      if (isAdmin || task.userId === userIdAuth) {
        canAccess = true;
      } else if (task.project) {
        const isMember = task.project.members.some(
          (member) => member.userId === userIdAuth
        );
        canAccess = isMember;
      }

      if (!canAccess) {
        return res.status(403).json({
          message: "Forbidden: You do not have permission to view this task.",
        });
      }

      const taskResponse = { ...task };
      if (taskResponse.project) delete taskResponse.project.members;
      return res.status(200).json(taskResponse);
    }

    // Logika dla pobierania listy zadań z filtrami
    const {
      status,
      priority,
      categoryId,
      projectId,
      sortBy = "createdAt",
      sortOrder = "desc",
      userId: targetUserIdQuery,
    } = filters;
    const isCallingService = userRoles.includes("service-role");
    const where = {};

    if (isCallingService) {
      // Logika dla wywołań M2M (np. z serwisu projektów)
      if (projectId) where.projectId = projectId;
      else if (targetUserIdQuery) where.userId = targetUserIdQuery;
    } else {
      // Logika dla wywołań od użytkownika
      let userProjectIds = [];
      if (!projectId) {
        const userMemberships = await prisma.projectMembership.findMany({
          where: { userId: userIdAuth },
          select: { projectId: true },
        });
        userProjectIds = userMemberships.map((m) => m.projectId);
      }

      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: { members: true },
        });
        const isMember = project?.members.some((m) => m.userId === userIdAuth);
        if (!isAdmin && !isMember) {
          return res.status(403).json({
            message:
              "Forbidden: You do not have access to this project's tasks.",
          });
        }
        where.projectId = projectId;
      } else {
        if (isAdmin && targetUserIdQuery) {
          where.userId = targetUserIdQuery;
        } else {
          where.OR = [
            { userId: userIdAuth, projectId: null },
            { projectId: { in: userProjectIds } },
          ];
        }
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

// Zaktualizowana funkcja do edycji zadania
exports.updateTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");
  const { id, ...dataToUpdate } = req.body;

  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const taskToUpdate = await prisma.task.findUnique({
      where: { id },
      include: { project: { include: { members: true } } },
    });

    if (!taskToUpdate) {
      return res.status(404).json({ message: "Task not found" });
    }

    let canUpdate = false;
    if (isAdmin || taskToUpdate.userId === userIdAuth) {
      canUpdate = true;
    } else if (taskToUpdate.project) {
      const projectMembership = taskToUpdate.project.members.find(
        (m) => m.userId === userIdAuth
      );
      if (
        projectMembership &&
        [ProjectRole.OWNER, ProjectRole.EDITOR].includes(projectMembership.role)
      ) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to update this task.",
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
      include: {
        category: true,
        project: { select: { id: true, name: true } },
      },
    });
    res.status(200).json(updatedTask);
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({
        message:
          "Invalid categoryId or projectId. Related record does not exist.",
      });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Failed to update task. The task does not exist." });
    }
    next(error);
  }
};

// Zaktualizowana funkcja do usuwania zadania
exports.deleteTask = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");
  const { id } = req.body;

  try {
    const taskToDelete = await prisma.task.findUnique({
      where: { id },
      include: { project: { include: { members: true } } },
    });

    if (!taskToDelete) {
      return res.status(404).json({ message: "Task not found" });
    }

    let canDelete = false;
    if (isAdmin || taskToDelete.userId === userIdAuth) {
      canDelete = true;
    } else if (taskToDelete.project) {
      const projectMembership = taskToDelete.project.members.find(
        (m) => m.userId === userIdAuth
      );
      if (
        projectMembership &&
        [ProjectRole.OWNER, ProjectRole.EDITOR].includes(projectMembership.role)
      ) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to delete this task.",
      });
    }

    await prisma.task.delete({ where: { id } });
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
