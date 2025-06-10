const prisma = require("../config/db");
const { TaskStatus } = require("@prisma/client");

exports.getTaskSummaryReport = async (req, res, next) => {
  const userIdAuth = req.headers["x-user-id"];
  if (!userIdAuth) {
    return res
      .status(401)
      .json({ message: "Unauthorized: User identifier not provided." });
  }

  try {
    const statusCounts = await prisma.task.groupBy({
      by: ["status"],
      where: { userId: userIdAuth },
      _count: {
        status: true,
      },
    });

    const tasksByStatus = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELLED: 0,
    };
    statusCounts.forEach((item) => {
      tasksByStatus[item.status] = item._count.status;
    });

    const totalTasks =
      tasksByStatus.TODO +
      tasksByStatus.IN_PROGRESS +
      tasksByStatus.DONE +
      tasksByStatus.CANCELLED;
    const finishedTasks = tasksByStatus.DONE + tasksByStatus.CANCELLED;
    const unfinishedTasks = tasksByStatus.TODO + tasksByStatus.IN_PROGRESS;

    const priorityCountsResult = await prisma.task.groupBy({
      by: ["priority"],
      where: { userId: userIdAuth },
      _count: {
        priority: true,
      },
    });
    const tasksByPriority = {};
    priorityCountsResult.forEach((item) => {
      tasksByPriority[item.priority] = item._count.priority;
    });

    const report = {
      totalTasks,
      finishedTasks,
      unfinishedTasks,
      tasksByStatus,
      tasksByPriority,
    };

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};
