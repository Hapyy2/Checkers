// controllers/taskController.js
const taskModel = require("../models/taskModel");

class TaskController {
  // Pobieranie zadań
  async getTasks(req, res, next) {
    try {
      const userId = req.kauth.grant.access_token.content.sub;
      const tasks = await taskModel.getMany({
        userId,
        ...req.query,
      });

      res.json({
        success: true,
        ...tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  // Pobieranie zadania po ID
  async getTaskById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.kauth.grant.access_token.content.sub;

      const task = await taskModel.getById(id, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Tworzenie zadania
  async createTask(req, res, next) {
    try {
      const userId = req.kauth.grant.access_token.content.sub;
      const task = await taskModel.create(req.body, userId);

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Aktualizacja zadania
  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.kauth.grant.access_token.content.sub;

      const task = await taskModel.update(id, req.body, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Częściowa aktualizacja
  async partialUpdateTask(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.kauth.grant.access_token.content.sub;

      const task = await taskModel.partialUpdate(id, req.body, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Usuwanie zadania
  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.kauth.grant.access_token.content.sub;

      const success = await taskModel.delete(id, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Aktualizacja statusu
  async updateTaskStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.kauth.grant.access_token.content.sub;

      const task = await taskModel.updateStatus(id, status, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Aktualizacja priorytetu
  async updateTaskPriority(req, res, next) {
    try {
      const { id } = req.params;
      const { priority } = req.body;
      const userId = req.kauth.grant.access_token.content.sub;

      const task = await taskModel.updatePriority(id, priority, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Przypisanie zadania
  async assignTask(req, res, next) {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;
      const userId = req.kauth.grant.access_token.content.sub;

      const task = await taskModel.assign(id, assignedTo, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: "Task not found",
        });
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  // Nowa metoda w taskController.js
  async getAllTasks(req, res, next) {
    try {
      // Admin widzi wszystkie zadania
      const tasks = await taskModel.getAllTasks();

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
