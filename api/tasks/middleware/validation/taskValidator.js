const { body } = require("express-validator");
const { TaskPriority, TaskStatus } = require("@prisma/client");

exports.validateTask = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required.")
    .isLength({ min: 3, max: 100 }),
  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),
  body("priority").optional().isIn(Object.values(TaskPriority)),
  body("status").optional().isIn(Object.values(TaskStatus)),
  body("dueDate").optional({ checkFalsy: true }).isISO8601().toDate(),
  body("categoryId").optional({ checkFalsy: true }).isString(),
  body("projectId").optional({ checkFalsy: true }).isString(),
];

exports.validateTaskUpdate = [
  body("id")
    .notEmpty()
    .isString()
    .withMessage("Task ID is required for update."),
  body("title").optional().trim().notEmpty().isLength({ min: 3, max: 100 }),
  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),
  body("priority").optional().isIn(Object.values(TaskPriority)),
  body("status").optional().isIn(Object.values(TaskStatus)),
  body("dueDate").optional({ checkFalsy: true }).isISO8601().toDate(),
  body("categoryId").optional({ checkFalsy: true }).isString(),
  body("projectId").optional({ checkFalsy: true }).isString(),
];

exports.validateTaskDelete = [
  body("id")
    .notEmpty()
    .isString()
    .withMessage("Task ID is required for deletion."),
];
