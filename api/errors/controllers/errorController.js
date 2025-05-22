const errorModel = require("../models/errorModel");
// controllers/errorController.js
const ErrorSchema = require("../models/errorSchema");

class ErrorController {
  async logError(req, res, next) {
    try {
      // Minimalna walidacja
      if (!req.body.error || !req.body.error.message) {
        return res.status(400).json({
          success: false,
          error: "Invalid error format",
        });
      }

      // Zapisz błąd do bazy
      const error = new ErrorSchema({
        service: req.body.service || "unknown",
        environment: req.body.environment || "development",
        level: req.body.level || "error",
        error: req.body.error,
        context: req.body.context || {},
        timestamp: new Date(),
      });

      await error.save();

      res.status(201).json({
        success: true,
        id: error._id,
      });
    } catch (err) {
      console.error("Error saving error report:", err);
      res.status(500).json({
        success: false,
        error: "Could not save error report",
      });
    }
  }

  async getErrors(req, res, next) {
    try {
      const result = await errorModel.findAll(req.query);

      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getErrorById(req, res, next) {
    try {
      const error = await errorModel.findById(req.params.id);

      if (!error) {
        return res.status(404).json({
          success: false,
          error: "Error not found",
        });
      }

      res.json({
        success: true,
        data: error,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await errorModel.getStats(req.query.timeframe);

      res.json({
        success: true,
        data: stats,
        timeframe: req.query.timeframe || "24h",
      });
    } catch (err) {
      next(err);
    }
  }

  async cleanup(req, res, next) {
    try {
      const result = await errorModel.cleanup(req.query.olderThan);

      res.json({
        success: true,
        deleted: result.deletedCount,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ErrorController();
