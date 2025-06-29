const prisma = require("../config/db");
const { validationResult } = require("express-validator");
const { ProjectRole } = require("@prisma/client");
const { getAccessToken } = require("../config/keycloakAuth");
const axios = require("axios");

exports.createProject = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const ownerId = req.headers["x-user-id"];
  if (!ownerId) {
    return res.status(401).json({
      message: "Unauthorized: User identifier not provided by gateway.",
    });
  }
  const { name, description, dueDate } = req.body;
  try {
    await prisma.user.upsert({
      where: { id: ownerId },
      update: {},
      create: { id: ownerId },
    });
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        ownerId: ownerId,
        members: {
          create: [{ userId: ownerId, role: ProjectRole.OWNER }],
        },
      },
      include: {
        owner: { select: { id: true } },
        members: { include: { user: { select: { id: true } } } },
      },
    });
    res.status(201).json(newProject);
  } catch (error) {
    next(error);
  }
};

exports.getProjects = async (req, res, next) => {
  const { id, userId: targetUserIdQuery } = req.query;
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
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true } },
          members: {
            select: {
              role: true,
              assignedAt: true,
              user: { select: { id: true } },
            },
          },
          tasks: { select: { id: true, title: true, status: true } },
        },
      });
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const isMember = project.members.some(
        (member) => member.user.id === userIdAuth
      );
      if (!isAdmin && !isMember && project.ownerId !== userIdAuth) {
        return res.status(403).json({
          message: "Forbidden: You do not have access to this project.",
        });
      }
      return res.status(200).json(project);
    }

    let whereClause = {};
    if (isAdmin && targetUserIdQuery) {
      whereClause = { ownerId: targetUserIdQuery };
    } else if (isAdmin) {
      whereClause = {};
    } else {
      whereClause = { members: { some: { userId: userIdAuth } } };
    }
    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true } },
        members: {
          select: {
            role: true,
            assignedAt: true,
            user: { select: { id: true } },
          },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");
  const { id, name, description, dueDate } = req.body;

  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const projectToUpdate = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!projectToUpdate) {
      return res.status(404).json({ message: "Project not found" });
    }

    const memberInfo = projectToUpdate.members.find(
      (m) => m.userId === userIdAuth
    );
    const isOwner = projectToUpdate.ownerId === userIdAuth;
    const isEditor = memberInfo && memberInfo.role === ProjectRole.EDITOR;

    if (!isAdmin && !isOwner && !isEditor) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot update this project." });
    }

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (dueDate !== undefined)
      dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;

    if (Object.keys(dataToUpdate).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update." });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: dataToUpdate,
      include: {
        owner: { select: { id: true } },
        members: { include: { user: { select: { id: true } } } },
      },
    });
    res.status(200).json(updatedProject);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Project not found for update." });
    }
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const userIdAuth = req.headers["x-user-id"];
  const isAdmin = (req.headers["x-user-roles"] || "").includes("admin");
  const { id } = req.body;

  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const projectToDelete = await prisma.project.findUnique({
      where: { id },
    });
    if (!projectToDelete) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (!isAdmin && projectToDelete.ownerId !== userIdAuth) {
      return res
        .status(403)
        .json({ message: "Forbidden: You cannot delete this project." });
    }
    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Project not found or already deleted." });
    }
    next(error);
  }
};

exports.addProjectMember = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const authenticatedUserId = req.headers["x-user-id"];
  const isAdmin = (req.headers["x-user-roles"] || "").includes("admin");
  const { projectId, userId: memberUserIdToAdd, role } = req.body;

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const authenticatedUserMembership = project.members.find(
      (m) => m.userId === authenticatedUserId
    );
    const canManageMembers =
      isAdmin ||
      project.ownerId === authenticatedUserId ||
      (authenticatedUserMembership &&
        authenticatedUserMembership.role === ProjectRole.EDITOR);

    if (!canManageMembers) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to add members to this project.",
      });
    }

    await prisma.user.upsert({
      where: { id: memberUserIdToAdd },
      update: {},
      create: { id: memberUserIdToAdd },
    });

    const newMembership = await prisma.projectMembership.upsert({
      where: { projectId_userId: { projectId, userId: memberUserIdToAdd } },
      update: { role: role || ProjectRole.MEMBER },
      create: {
        projectId,
        userId: memberUserIdToAdd,
        role: role || ProjectRole.MEMBER,
      },
      include: { user: { select: { id: true } } },
    });
    res.status(201).json(newMembership);
  } catch (error) {
    if (error.code === "P2003" && error.meta?.field_name?.includes("userId")) {
      return res.status(400).json({
        message: `User with ID ${memberUserIdToAdd} does not exist or cannot be added.`,
      });
    }
    next(error);
  }
};

exports.removeProjectMember = async (req, res, next) => {
  const authenticatedUserId = req.headers["x-user-id"];
  const isAdmin = (req.headers["x-user-roles"] || "").includes("admin");
  const { projectId, userId: memberUserIdToRemove } = req.body;

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
    if (project.ownerId === memberUserIdToRemove) {
      return res
        .status(400)
        .json({ message: "Cannot remove the project owner." });
    }

    const authenticatedUserMembership =
      await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: authenticatedUserId } },
      });

    const canManageMembers =
      isAdmin ||
      project.ownerId === authenticatedUserId ||
      (authenticatedUserMembership &&
        authenticatedUserMembership.role === ProjectRole.EDITOR);
    if (!canManageMembers && authenticatedUserId !== memberUserIdToRemove) {
      return res.status(403).json({
        message: "Forbidden: You do not have permission to remove this member.",
      });
    }

    await prisma.projectMembership.delete({
      where: { projectId_userId: { projectId, userId: memberUserIdToRemove } },
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Membership not found or member already removed." });
    }
    next(error);
  }
};

exports.updateProjectMemberRole = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const authenticatedUserId = req.headers["x-user-id"];
  const isAdmin = (req.headers["x-user-roles"] || "").includes("admin");
  const { projectId, userId: memberUserIdToUpdate, role: newRole } = req.body;

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (newRole === ProjectRole.OWNER) {
    return res
      .status(400)
      .json({ message: "Cannot change role to OWNER via this method." });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
    if (project.ownerId === memberUserIdToUpdate) {
      return res
        .status(400)
        .json({ message: "Project owner's role cannot be changed." });
    }

    const authenticatedUserMembership =
      await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: authenticatedUserId } },
      });

    const canManageMembers =
      isAdmin ||
      project.ownerId === authenticatedUserId ||
      (authenticatedUserMembership &&
        authenticatedUserMembership.role === ProjectRole.EDITOR);

    if (!canManageMembers) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to update member roles.",
      });
    }

    const updatedMembership = await prisma.projectMembership.update({
      where: { projectId_userId: { projectId, userId: memberUserIdToUpdate } },
      data: { role: newRole },
      include: { user: { select: { id: true } } },
    });
    res.status(200).json(updatedMembership);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "Membership not found for role update." });
    }
    next(error);
  }
};

exports.getProjectMembers = async (req, res, next) => {
  const authenticatedUserId = req.headers["x-user-id"];
  const isAdmin = (req.headers["x-user-roles"] || "").includes("admin");
  const { projectId } = req.query;

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const isMember = project.members.some(
      (m) => m.userId === authenticatedUserId
    );
    if (!isAdmin && !isMember) {
      return res.status(403).json({
        message: "Forbidden: You cannot view members of this project.",
      });
    }

    const members = await prisma.projectMembership.findMany({
      where: { projectId },
      include: { user: { select: { id: true } } },
      orderBy: { assignedAt: "asc" },
    });
    res.status(200).json(members);
  } catch (error) {
    next(error);
  }
};

exports.getProjectTasks = async (req, res, next) => {
  const authenticatedUserId = req.headers["x-user-id"];
  const isAdmin = (req.headers["x-user-roles"] || "").includes("admin");
  const { projectId } = req.query;

  if (!authenticatedUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const isMember = project.members.some(
      (m) => m.userId === authenticatedUserId
    );
    if (!isAdmin && !isMember) {
      return res.status(403).json({
        message: "Forbidden: You do not have access to this project's tasks.",
      });
    }

    const m2mToken = await getAccessToken();
    if (!m2mToken) {
      return next(
        new Error("Failed to obtain M2M token for internal service call.")
      );
    }

    const tasksApiUrl = `${process.env.API_GATEWAY_TASKS_INTERNAL_URL}?projectId=${projectId}`;

    const response = await axios.get(tasksApiUrl, {
      headers: { Authorization: `Bearer ${m2mToken}` },
      timeout: 10000,
    });
    res.status(200).json(response.data);
  } catch (error) {
    if (error.isAxiosError) {
      console.error(
        "[projects-api] Error calling tasks-api:",
        error.response?.data || error.message
      );
      return next(
        new Error(
          `Failed to retrieve tasks from tasks-service: ${
            error.response?.statusText || error.message
          }`
        )
      );
    }
    next(error);
  }
};
