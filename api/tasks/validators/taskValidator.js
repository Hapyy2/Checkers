// validators/taskValidator.js
const { body, param, query, validationResult } = require("express-validator");
const { AppError } = require("../utils/errors");

// Middleware do sprawdzania błędów walidacji
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError("Validation error", 400, errors.array());
  }
  next();
};

// Enums z Prisma schema
const TaskStatus = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CANCELLED"];
const TaskPriority = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const RecurrenceFrequency = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

const taskValidators = {
  getTasks: [
    query("status").optional().isIn(TaskStatus).withMessage("Invalid status"),
    query("priority")
      .optional()
      .isIn(TaskPriority)
      .withMessage("Invalid priority"),
    query("projectId").optional().isUUID().withMessage("Invalid project ID"),
    query("assignedTo").optional().isUUID().withMessage("Invalid user ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("sort")
      .optional()
      .isIn(["createdAt", "dueDate", "priority", "updatedAt"])
      .withMessage("Invalid sort field"),
    query("order")
      .optional()
      .isIn(["asc", "desc"])
      .withMessage("Order must be asc or desc"),
    validate,
  ],

  getTaskById: [param("id").isUUID().withMessage("Invalid task ID"), validate],

  createTask: [
    body("title")
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title is required and must be between 1-255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description must be less than 5000 characters"),
    body("status").optional().isIn(TaskStatus).withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(TaskPriority)
      .withMessage("Invalid priority"),
    body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
    body("assignedTo").optional().isUUID().withMessage("Invalid user ID"),
    body("projectId").optional().isUUID().withMessage("Invalid project ID"),
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array"),
    body("categories.*").optional().isUUID().withMessage("Invalid category ID"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*").optional().isUUID().withMessage("Invalid tag ID"),
    body("recurrence")
      .optional()
      .isObject()
      .withMessage("Recurrence must be an object"),
    body("recurrence.frequency")
      .optional()
      .isIn(RecurrenceFrequency)
      .withMessage("Invalid recurrence frequency"),
    body("recurrence.interval")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Interval must be a positive integer"),
    body("recurrence.daysOfWeek")
      .optional()
      .matches(/^[0-6](,[0-6])*$/)
      .withMessage("Days of week must be comma-separated numbers 0-6"),
    body("recurrence.dayOfMonth")
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage("Day of month must be between 1-31"),
    body("recurrence.monthOfYear")
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage("Month must be between 1-12"),
    body("recurrence.endDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid end date format"),
    body("recurrence.occurrences")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Occurrences must be a positive integer"),
    validate,
  ],

  updateTask: [
    param("id").isUUID().withMessage("Invalid task ID"),
    body("title")
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title is required and must be between 1-255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description must be less than 5000 characters"),
    body("status").optional().isIn(TaskStatus).withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(TaskPriority)
      .withMessage("Invalid priority"),
    body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
    body("assignedTo").optional().isUUID().withMessage("Invalid user ID"),
    body("projectId").optional().isUUID().withMessage("Invalid project ID"),
    body("categories")
      .optional()
      .isArray()
      .withMessage("Categories must be an array"),
    body("categories.*").optional().isUUID().withMessage("Invalid category ID"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*").optional().isUUID().withMessage("Invalid tag ID"),
    body("recurrence")
      .optional()
      .custom((value) => {
        return value === null || typeof value === "object";
      })
      .withMessage("Recurrence must be an object or null"),
    validate,
  ],

  partialUpdateTask: [
    param("id").isUUID().withMessage("Invalid task ID"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage("Title must be between 1-255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage("Description must be less than 5000 characters"),
    body("status").optional().isIn(TaskStatus).withMessage("Invalid status"),
    body("priority")
      .optional()
      .isIn(TaskPriority)
      .withMessage("Invalid priority"),
    body("dueDate").optional().isISO8601().withMessage("Invalid date format"),
    body("assignedTo").optional().isUUID().withMessage("Invalid user ID"),
    body("projectId").optional().isUUID().withMessage("Invalid project ID"),
    validate,
  ],

  deleteTask: [param("id").isUUID().withMessage("Invalid task ID"), validate],

  updateTaskStatus: [
    param("id").isUUID().withMessage("Invalid task ID"),
    body("status").notEmpty().isIn(TaskStatus).withMessage("Invalid status"),
    validate,
  ],

  updateTaskPriority: [
    param("id").isUUID().withMessage("Invalid task ID"),
    body("priority")
      .notEmpty()
      .isIn(TaskPriority)
      .withMessage("Invalid priority"),
    validate,
  ],

  assignTask: [
    param("id").isUUID().withMessage("Invalid task ID"),
    body("assignedTo")
      .optional({ nullable: true })
      .isUUID()
      .withMessage("Invalid user ID"),
    validate,
  ],
};

module.exports = taskValidators;
