const express = require("express");
const router = express.Router();
const errorController = require("../controllers/errorController");
const {
  validateErrorLog,
  validateGetErrorsQuery,
  healthCheck,
} = require("../middleware/validator");

// POST /api/errors/log - Log a new error
router.post("/log", validateErrorLog, errorController.logError);

// GET /api/errors - Retrieve logged errors
router.get("/", validateGetErrorsQuery, errorController.getErrors);

// GET /api/errors/health - Health check endpoint
router.get("/health", errorController.healthCheck);

module.exports = router;
