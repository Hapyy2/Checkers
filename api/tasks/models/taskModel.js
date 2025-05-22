// models/taskModel.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class TaskModel {
  async getMany({
    userId,
    status,
    priority,
    projectId,
    assignedTo,
    page = 1,
    limit = 20,
    sort = "createdAt",
    order = "desc",
    includeDeleted = false,
  }) {
    const skip = (page - 1) * limit;

    const where = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      OR: [{ createdBy: userId }, { assignedTo: userId }],
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (assignedTo) where.assignedTo = assignedTo;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          comments: { where: { deletedAt: null } },
          recurrence: true,
        },
      }),
      prisma.task.count({ where }),
    ]);

    return {
      data: tasks.map(this.formatTask),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id, userId) {
    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ createdBy: userId }, { assignedTo: userId }],
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
        },
        recurrence: true,
      },
    });

    return task ? this.formatTask(task) : null;
  }

  async create(data, userId) {
    const { categories, tags, recurrence, ...taskData } = data;

    const task = await prisma.task.create({
      data: {
        ...taskData,
        createdBy: userId,
        categories: {
          create:
            categories?.map((categoryId) => ({
              categoryId,
            })) || [],
        },
        tags: {
          create:
            tags?.map((tagId) => ({
              tagId,
            })) || [],
        },
        recurrence: recurrence
          ? {
              create: recurrence,
            }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        recurrence: true,
      },
    });

    return this.formatTask(task);
  }

  async update(id, data, userId) {
    const { categories, tags, recurrence, ...taskData } = data;

    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ createdBy: userId }, { assignedTo: userId }],
      },
    });

    if (!task) return null;

    const updatedTask = await prisma.$transaction(async (tx) => {
      // Aktualizacja podstawowych danych
      await tx.task.update({
        where: { id },
        data: taskData,
      });

      // Aktualizacja kategorii jeśli podane
      if (categories !== undefined) {
        await tx.taskCategory.deleteMany({ where: { taskId: id } });
        await tx.taskCategory.createMany({
          data: categories.map((categoryId) => ({
            taskId: id,
            categoryId,
          })),
        });
      }

      // Aktualizacja tagów jeśli podane
      if (tags !== undefined) {
        await tx.taskTag.deleteMany({ where: { taskId: id } });
        await tx.taskTag.createMany({
          data: tags.map((tagId) => ({
            taskId: id,
            tagId,
          })),
        });
      }

      // Aktualizacja cykliczności jeśli podana
      if (recurrence !== undefined) {
        await tx.taskRecurrence.deleteMany({ where: { taskId: id } });
        if (recurrence) {
          await tx.taskRecurrence.create({
            data: { ...recurrence, taskId: id },
          });
        }
      }

      return await tx.task.findUnique({
        where: { id },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          recurrence: true,
        },
      });
    });

    return this.formatTask(updatedTask);
  }

  async partialUpdate(id, data, userId) {
    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ createdBy: userId }, { assignedTo: userId }],
      },
    });

    if (!task) return null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        recurrence: true,
      },
    });

    return this.formatTask(updatedTask);
  }

  async updateStatus(id, status, userId) {
    return this.partialUpdate(
      id,
      {
        status,
        ...(status === "DONE"
          ? { completedAt: new Date() }
          : { completedAt: null }),
      },
      userId
    );
  }

  async updatePriority(id, priority, userId) {
    return this.partialUpdate(id, { priority }, userId);
  }

  async assign(id, assignedTo, userId) {
    return this.partialUpdate(id, { assignedTo }, userId);
  }

  async delete(id, userId) {
    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        createdBy: userId, // tylko właściciel może usunąć
      },
    });

    if (!task) return false;

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return true;
  }

  async hasAccess(taskId, userId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        OR: [{ createdBy: userId }, { assignedTo: userId }],
      },
    });

    return !!task;
  }

  formatTask(task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      projectId: task.projectId,
      categories: task.categories?.map((tc) => tc.category) || [],
      tags: task.tags?.map((tt) => tt.tag) || [],
      commentCount: task.comments?.length || 0,
      isRecurring: !!task.recurrence,
      recurrence: task.recurrence,
    };
  }

  // Nowa metoda w taskModel.js
  async getAllTasks() {
    const tasks = await prisma.task.findMany({
      where: { deletedAt: null },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        comments: { where: { deletedAt: null } },
        recurrence: true,
      },
    });

    return {
      data: tasks.map(this.formatTask),
      total: tasks.length,
    };
  }
}

module.exports = new TaskModel();
