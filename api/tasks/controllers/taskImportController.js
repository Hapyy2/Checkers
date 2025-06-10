const prisma = require("../config/db");
const csv = require("csv-parser");
const { Readable } = require("stream");

// Funkcja pomocnicza do tworzenia zadań z tablicy danych
const processTasks = async (tasksArray, userId) => {
  const results = { successfullyImported: 0, failedImports: [] };

  for (const taskData of tasksArray) {
    try {
      if (!taskData.title) throw new Error("Task title is required.");

      const {
        title,
        description,
        priority,
        status,
        dueDate,
        projectId,
        categoryId,
      } = taskData;
      await prisma.task.create({
        data: {
          title,
          description: description || null,
          priority: priority || undefined,
          status: status || undefined,
          dueDate: dueDate ? new Date(dueDate) : null,
          categoryId: categoryId || null,
          projectId: projectId || null,
          userId: userId,
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
  return results;
};

// Główna funkcja kontrolera, która wykrywa format i deleguje logikę
exports.importTasksFromFile = async (req, res, next) => {
  const userIdAuth = req.headers["x-user-id"];
  if (!userIdAuth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    // Upewnij się, że użytkownik istnieje
    await prisma.user.upsert({
      where: { id: userIdAuth },
      update: {},
      create: { id: userIdAuth },
    });

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    if (mimeType === "application/json") {
      const tasksToImport = JSON.parse(fileBuffer.toString("utf8"));
      if (!Array.isArray(tasksToImport)) {
        throw new Error("Invalid JSON format. Expected an array of tasks.");
      }
      const results = await processTasks(tasksToImport, userIdAuth);
      res.status(200).json(results);
    } else if (mimeType === "text/csv") {
      const tasksToImport = [];
      const stream = Readable.from(fileBuffer.toString("utf8"));

      stream
        .pipe(csv())
        .on("data", (row) => tasksToImport.push(row))
        .on("end", async () => {
          try {
            const results = await processTasks(tasksToImport, userIdAuth);
            res.status(200).json(results);
          } catch (processingError) {
            next(processingError);
          }
        })
        .on("error", (error) => next(error));
    } else {
      res.status(400).json({
        message: "Unsupported file type. Please upload a CSV or JSON file.",
      });
    }
  } catch (error) {
    next(error);
  }
};
