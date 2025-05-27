const prisma = require("../config/db");
const { validationResult } = require("express-validator");
const { TaskPriority, TaskStatus, ProjectRole } = require("@prisma/client");

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
      const projectMembership = await prisma.projectMembership.findUnique({
        where: {
          projectId_userId: {
            projectId: projectId,
            userId: userIdFromHeader,
          },
        },
      });
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return res
          .status(404)
          .json({ message: `Project with ID ${projectId} not found.` });
      }
      const canCreateTaskInProject =
        (projectMembership &&
          (projectMembership.role === ProjectRole.OWNER ||
            projectMembership.role === ProjectRole.EDITOR ||
            projectMembership.role === ProjectRole.MEMBER)) ||
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
    if (categoryId) {
      taskData.categoryId = categoryId;
    }
    if (projectId) {
      taskData.projectId = projectId;
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
        message: "Category with this name already exists for this user.",
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

exports.getAllTasks = async (req, res, next) => {
  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isCallingService = userRoles.includes("service-role");
  const isAdmin = userRoles.includes("admin");

  const {
    status,
    priority,
    categoryId,
    projectId,
    sortBy = "createdAt",
    sortOrder = "desc",
    userId: targetUserIdQuery,
  } = req.query;

  if (!userIdAuth && !isCallingService) {
    return res.status(401).json({
      message: "Unauthorized: User identifier or service role not provided.",
    });
  }

  const where = {};

  if (isCallingService) {
    if (projectId) {
      where.projectId = projectId;
    } else {
      if (targetUserIdQuery) where.userId = targetUserIdQuery;
    }
  } else {
    if (projectId) {
      where.projectId = projectId;
      if (!isAdmin) {
        const projectMembership = await prisma.projectMembership.findUnique({
          where: {
            projectId_userId: { projectId: projectId, userId: userIdAuth },
          },
        });
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!projectMembership && project?.ownerId !== userIdAuth) {
          return res.status(403).json({
            message:
              "Forbidden: You do not have access to this project's tasks.",
          });
        }
      } else if (isAdmin && targetUserIdQuery) {
        where.userId = targetUserIdQuery;
      }
    } else {
      if (isAdmin && targetUserIdQuery) {
        where.userId = targetUserIdQuery;
      } else {
        where.userId = userIdAuth;
      }
    }
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;

  try {
    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: true,
        project: { select: { id: true, name: true } },
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
      include: {
        category: true,
        project: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    let canAccess = false;
    if (isAdmin) {
      canAccess = true;
    } else if (task.userId === userIdAuth) {
      canAccess = true;
    } else if (task.project) {
      const projectMembership = task.project.members.find(
        (member) => member.userId === userIdAuth
      );
      if (projectMembership) {
        if (
          [
            ProjectRole.OWNER,
            ProjectRole.EDITOR,
            ProjectRole.MEMBER,
            ProjectRole.VIEWER,
          ].includes(projectMembership.role)
        ) {
          canAccess = true;
        }
      } else if (task.project.ownerId === userIdAuth) {
        canAccess = true;
      }
    }

    if (!canAccess) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to view this task.",
      });
    }

    const taskResponse = { ...task };
    if (taskResponse.project) {
      delete taskResponse.project.members;
    }

    res.status(200).json(taskResponse);
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
  const {
    title,
    description,
    priority,
    status,
    dueDate,
    categoryId,
    projectId,
  } = req.body;
  try {
    const taskToUpdate = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { members: true },
        },
      },
    });
    if (!taskToUpdate) {
      return res.status(404).json({ message: "Task not found" });
    }
    let canUpdate = false;
    if (isAdmin) {
      canUpdate = true;
    } else if (taskToUpdate.userId === userIdAuth) {
      canUpdate = true;
    } else if (taskToUpdate.project) {
      const projectMembership = taskToUpdate.project.members.find(
        (m) => m.userId === userIdAuth
      );
      if (
        projectMembership &&
        (projectMembership.role === ProjectRole.OWNER ||
          projectMembership.role === ProjectRole.EDITOR)
      ) {
        canUpdate = true;
      } else if (taskToUpdate.project.ownerId === userIdAuth) {
        canUpdate = true;
      }
    }
    if (!canUpdate) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to update this task.",
      });
    }
    if (projectId) {
      const projectExists = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!projectExists) {
        return res
          .status(400)
          .json({ message: `Project with ID ${projectId} not found.` });
      }
      if (!isAdmin && projectExists.ownerId !== userIdAuth) {
        const newProjectMembership = await prisma.projectMembership.findUnique({
          where: {
            projectId_userId: { projectId: projectId, userId: userIdAuth },
          },
        });
        if (
          !newProjectMembership ||
          ![ProjectRole.OWNER, ProjectRole.EDITOR, ProjectRole.MEMBER].includes(
            newProjectMembership.role
          )
        ) {
          return res.status(403).json({
            message:
              "Forbidden: You do not have permission to move this task to the target project.",
          });
        }
      }
    }
    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (status !== undefined) dataToUpdate.status = status;
    if (dueDate !== undefined)
      dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (categoryId !== undefined) dataToUpdate.categoryId = categoryId;
    if (projectId !== undefined) dataToUpdate.projectId = projectId;
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
    if (error.code === "P2025") {
      return res.status(404).json({
        message:
          "Failed to update task. Related record not found (e.g. category or project).",
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
    const taskToDelete = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: { members: true },
        },
      },
    });
    if (!taskToDelete) {
      return res.status(404).json({ message: "Task not found" });
    }
    let canDelete = false;
    if (isAdmin) {
      canDelete = true;
    } else if (taskToDelete.userId === userIdAuth) {
      canDelete = true;
    } else if (taskToDelete.project) {
      const projectMembership = taskToDelete.project.members.find(
        (m) => m.userId === userIdAuth
      );
      if (
        projectMembership &&
        (projectMembership.role === ProjectRole.OWNER ||
          projectMembership.role === ProjectRole.EDITOR)
      ) {
        canDelete = true;
      } else if (taskToDelete.project.ownerId === userIdAuth) {
        canDelete = true;
      }
    }
    if (!canDelete) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to delete this task.",
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
