const ErrorLog = require("../models/errorLog");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// GET /api/errors/health - Sprawdzenie stanu serwisu
exports.healthCheck = async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    let dbStatus = "disconnected";

    if (dbState === 1) {
      await mongoose.connection.db.admin().ping();
      dbStatus = "connected";
    } else if (dbState === 0) {
      dbStatus = "disconnected";
    } else if (dbState === 2) {
      dbStatus = "connecting";
    } else if (dbState === 3) {
      dbStatus = "disconnecting";
    }

    if (dbStatus === "connected") {
      res.status(200).json({
        status: "OK",
        message: "Errors API is healthy",
        timestamp: new Date().toISOString(),
        dependencies: {
          database: dbStatus,
        },
      });
    } else {
      throw new Error(
        `Database is not connected. Current state: ${dbState} (${dbStatus})`
      );
    }
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "ERROR",
      message: "Errors API is unhealthy.",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: `failed (${mongoose.connection.readyState})`,
      },
      details: error.message,
    });
  }
};

// POST /api/errors/log - Log a new error
exports.logError = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      timestamp,
      sourceService,
      errorMessage,
      errorCode,
      requestDetails,
      stackTrace,
      additionalContext,
    } = req.body;

    const newErrorLog = new ErrorLog({
      timestamp: timestamp ? new Date(timestamp) : new Date(), // Default to now if not provided
      sourceService,
      errorMessage,
      errorCode,
      requestDetails,
      stackTrace,
      additionalContext,
    });

    const savedError = await newErrorLog.save();
    res
      .status(201)
      .json({ message: "Error logged successfully", errorId: savedError._id });
  } catch (err) {
    console.error("FATAL: Failed to save error log to database:", err);
    res.status(500).json({
      message: "Internal server error while trying to log the error.",
    });
  }
};

// GET /api/errors - Retrieve logged errors
exports.getErrors = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { sourceService, sortOrder } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    let query = {};
    if (sourceService) {
      query.sourceService = sourceService;
    }

    let sort = { timestamp: -1 };
    if (sortOrder === "oldest") {
      sort = { timestamp: 1 };
    }

    const errorLogs = await ErrorLog.find(query).sort(sort).limit(limit).lean(); // .lean() for faster queries if you don't need Mongoose documents

    const totalErrors = await ErrorLog.countDocuments(query);

    res.status(200).json({
      message: "Errors retrieved successfully.",
      data: errorLogs,
      pagination: {
        total: totalErrors,
        limit: limit,
      },
    });
  } catch (err) {
    console.error("Failed to retrieve error logs:", err);
    res.status(500).json({
      message: "Failed to retrieve error logs due to an internal issue.",
    });
  }
};
