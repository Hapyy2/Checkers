const prisma = require("../config/db");
const { validationResult } = require("express-validator");
const { Parser } = require("json2csv");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const exportJobs = new Map();
const EXPORT_TTL = 5 * 60 * 1000;
const EXPORT_DIR = "/tmp/exports";

const buildPrismaQueryArgs = (req) => {
  const { filters = {} } = req.body;
  const { status, priority, categoryId, projectId } = filters;
  const userIdAuth = req.headers["x-user-id"];

  const where = { userId: userIdAuth };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  if (projectId) where.projectId = projectId;

  return {
    where,
    include: {
      category: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  };
};

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
  }));
};

exports.requestExport = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userIdAuth = req.headers["x-user-id"];
  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { format } = req.body;
  const exportId = crypto.randomUUID();
  const fileName = `export-${exportId}.${format}`;
  const filePath = path.join(EXPORT_DIR, fileName);

  const publicGatewayUrl =
    process.env.API_GATEWAY_PUBLIC_URL || "http://localhost:3001";
  const fullDownloadUrl = `${publicGatewayUrl}/gw/export/download/${exportId}`;

  res.status(202).json({
    downloadUrl: fullDownloadUrl,
  });

  (async () => {
    try {
      await fs.mkdir(EXPORT_DIR, { recursive: true });
      exportJobs.set(exportId, { status: "processing", ownerId: userIdAuth });

      const prismaArgs = buildPrismaQueryArgs(req);
      const tasksToExport = await getTasksForExport(prismaArgs);

      let fileContent;
      if (format === "csv") {
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
        ];
        const json2csvParser = new Parser({ fields });
        fileContent = json2csvParser.parse(tasksToExport);
      } else {
        fileContent = JSON.stringify(tasksToExport, null, 2);
      }

      await fs.writeFile(filePath, fileContent);
      exportJobs.set(exportId, {
        status: "completed",
        filePath,
        fileName,
        ownerId: userIdAuth,
      });

      setTimeout(() => {
        exportJobs.delete(exportId);
        fs.unlink(filePath).catch((err) =>
          console.error(`Failed to auto-delete temp file ${filePath}:`, err)
        );
      }, EXPORT_TTL);
    } catch (error) {
      exportJobs.set(exportId, {
        status: "failed",
        error: error.message,
        ownerId: userIdAuth,
      });
      console.error(`Export job ${exportId} failed:`, error);
    }
  })();
};

exports.downloadExportFile = async (req, res, next) => {
  const { exportId } = req.params;
  const userIdAuth = req.headers["x-user-id"];
  const job = exportJobs.get(exportId);

  if (!job) {
    return res
      .status(404)
      .json({ message: "Export job not found or has expired." });
  }

  if (job.ownerId !== userIdAuth) {
    return res
      .status(403)
      .json({ message: "Forbidden: You did not request this export." });
  }

  if (job.status === "processing") {
    return res.status(202).json({
      message: "Export is still being processed. Please try again in a moment.",
    });
  }

  if (job.status === "failed") {
    return res
      .status(500)
      .json({ message: "Export job failed.", error: job.error });
  }

  if (job.status === "completed") {
    res.download(job.filePath, job.fileName, (err) => {
      exportJobs.delete(exportId);
      if (err) {
        if (!res.headersSent) {
          console.error(`Error sending file ${job.filePath}:`, err);
        }
      } else {
        fs.unlink(job.filePath).catch((e) =>
          console.error(`Failed to delete file after download: ${e.message}`)
        );
      }
    });
  } else {
    res.status(500).json({ message: "Unknown job status." });
  }
};
