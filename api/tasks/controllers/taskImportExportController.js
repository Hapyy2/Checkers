const prisma = require("../config/db");
const { Parser } = require("json2csv");
const csv = require("csv-parser");
const { Readable } = require("stream");

const getTasksForExport = async (prismaArgs) => {
  const tasks = await prisma.task.findMany(prismaArgs);
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    categoryName: task.category ? task.category.name : "",
    projectName: task.project ? task.project.name : "",
    userId: task.userId,
    projectId: task.projectId || "",
    categoryId: task.categoryId || "",
  }));
};

const buildPrismaQueryArgsForExport = async (req) => {
  const userIdAuth = req.headers["x-user-id"];
  const userRoles = (req.headers["x-user-roles"] || "").split(",");
  const isAdmin = userRoles.includes("admin");
  const {
    projectId,
    categoryId,
    status,
    priority,
    userId: targetUserIdQuery,
  } = req.query;

  if (!userIdAuth && !isAdmin) {
    throw {
      status: 401,
      message: "Unauthorized: User identifier not provided.",
    };
  }

  const where = {};

  if (isAdmin && targetUserIdQuery) {
    where.userId = targetUserIdQuery;
  } else if (!isAdmin) {
    where.userId = userIdAuth;
  }

  if (projectId) {
    where.projectId = projectId;
    if (!isAdmin) {
      const projectMembership = await prisma.projectMembership.findUnique({
        where: { projectId_userId: { projectId, userId: userIdAuth } },
      });
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!projectMembership && project?.ownerId !== userIdAuth) {
        throw {
          status: 403,
          message: "Forbidden: You do not have access to this project's tasks.",
        };
      }
      if (
        !(isAdmin && targetUserIdQuery) &&
        (projectMembership || project?.ownerId === userIdAuth)
      ) {
        delete where.userId;
      }
    }
  }

  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  return {
    where,
    include: {
      category: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  };
};

exports.exportTasksAsJson = async (req, res, next) => {
  try {
    const prismaArgs = await buildPrismaQueryArgsForExport(req);
    const tasksToExport = await getTasksForExport(prismaArgs);
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tasks_export.json"
    );
    res.status(200).json(tasksToExport);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

exports.exportTasksAsCsv = async (req, res, next) => {
  try {
    const prismaArgs = await buildPrismaQueryArgsForExport(req);
    const tasksToExport = await getTasksForExport(prismaArgs);

    const fields = [
      "id",
      "title",
      "description",
      "priority",
      "status",
      "dueDate",
      "createdAt",
      "updatedAt",
      "categoryName",
      "projectName",
      "userId",
      "projectId",
      "categoryId",
    ];
    const json2csvParser = new Parser({ fields });
    const csvData = json2csvParser.parse(tasksToExport);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=tasks_export.csv"
    );
    res.status(200).send(csvData);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

exports.importTasksFromJson = async (req, res, next) => {
  const userIdAuth = req.headers["x-user-id"];
  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "No JSON file uploaded." });
  }

  const results = { successfullyImported: 0, failedImports: [] };
  let tasksToImport;

  try {
    tasksToImport = JSON.parse(req.file.buffer.toString("utf8"));
    if (!Array.isArray(tasksToImport)) {
      return res
        .status(400)
        .json({ message: "Invalid JSON format. Expected an array of tasks." });
    }
  } catch (e) {
    return res.status(400).json({ message: "Failed to parse JSON file." });
  }

  await prisma.user.upsert({
    where: { id: userIdAuth },
    update: {},
    create: { id: userIdAuth },
  });

  for (const taskData of tasksToImport) {
    try {
      if (!taskData.title) {
        results.failedImports.push({
          taskTitle: "N/A",
          reason: "Task title is required.",
        });
        continue;
      }

      let finalCategoryId = taskData.categoryId || null;
      if (taskData.categoryName) {
        const category = await prisma.category.upsert({
          where: {
            name_userId: { name: taskData.categoryName, userId: userIdAuth },
          },
          update: {},
          create: { name: taskData.categoryName, userId: userIdAuth },
        });
        finalCategoryId = category.id;
      }

      let finalProjectId = taskData.projectId || null;
      if (finalProjectId) {
        const projectExists = await prisma.project.findUnique({
          where: { id: finalProjectId },
        });
        if (!projectExists) {
          finalProjectId = null;
        }
      }

      const { title, description, priority, status, dueDate } = taskData;
      await prisma.task.create({
        data: {
          title,
          description: description || null,
          priority: priority || undefined,
          status: status || undefined,
          dueDate: dueDate ? new Date(dueDate) : null,
          categoryId: finalCategoryId,
          projectId: finalProjectId,
          userId: userIdAuth,
        },
      });
      results.successfullyImported++;
    } catch (e) {
      results.failedImports.push({
        taskTitle: taskData.title || "N/A",
        reason: e.message,
      });
    }
  }
  res.status(200).json(results);
};

exports.importTasksFromCsv = async (req, res, next) => {
  const userIdAuth = req.headers["x-user-id"];
  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded." });
  }

  const results = { successfullyImported: 0, failedImports: [] };
  const tasksBuffer = req.file.buffer;

  await prisma.user.upsert({
    where: { id: userIdAuth },
    update: {},
    create: { id: userIdAuth },
  });

  const stream = Readable.from(tasksBuffer.toString("utf8"));
  stream
    .pipe(csv())
    .on("data", async (row) => {
      stream.pause();
      try {
        if (!row.title) {
          results.failedImports.push({
            taskTitle: "N/A",
            reason: "Task title is required.",
          });
          return;
        }

        let finalCategoryId = row.categoryId || null;
        if (row.categoryName) {
          const category = await prisma.category.upsert({
            where: {
              name_userId: { name: row.categoryName, userId: userIdAuth },
            },
            update: {},
            create: { name: row.categoryName, userId: userIdAuth },
          });
          finalCategoryId = category.id;
        }

        let finalProjectId = row.projectId || null;
        if (finalProjectId) {
          const projectExists = await prisma.project.findUnique({
            where: { id: finalProjectId },
          });
          if (!projectExists) {
            finalProjectId = null;
          }
        }

        await prisma.task.create({
          data: {
            title: row.title,
            description: row.description || null,
            priority: row.priority || undefined,
            status: row.status || undefined,
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            categoryId: finalCategoryId,
            projectId: finalProjectId,
            userId: userIdAuth,
          },
        });
        results.successfullyImported++;
      } catch (e) {
        results.failedImports.push({
          taskTitle: row.title || "N/A",
          reason: e.message,
        });
      } finally {
        stream.resume();
      }
    })
    .on("end", () => {
      res.status(200).json(results);
    })
    .on("error", (error) => {
      next(error);
    });
};
