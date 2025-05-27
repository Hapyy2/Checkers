const { body } = require("express-validator");
const { TaskPriority, TaskStatus } = require("@prisma/client");

exports.validateTask = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Task title must be between 3 and 100 characters."),
  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
  body("priority")
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `Invalid priority. Must be one of: ${Object.values(TaskPriority).join(
        ", "
      )}`
    ),
  body("status")
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `Invalid status. Must be one of: ${Object.values(TaskStatus).join(", ")}`
    ),
  body("dueDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid due date format. Must be ISO8601.")
    .toDate(),
  body("categoryId")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Category ID must be a string if provided.")
    .isLength({ min: 1 })
    .withMessage("Category ID cannot be empty if provided."),
  body("projectId")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Project ID must be a string if provided.")
    .isLength({ min: 1 })
    .withMessage("Project ID cannot be empty if provided."),
];
