const { body, param } = require("express-validator");
const { ProjectRole } = require("@prisma/client");

exports.validateProject = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Project name must be between 3 and 100 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
  body("dueDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid due date format. Must be ISO8601.")
    .toDate(),
];

exports.validateProjectUpdate = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Project name cannot be empty if provided.")
    .isLength({ min: 3, max: 100 })
    .withMessage("Project name must be between 3 and 100 characters."),
  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),
  body("dueDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage("Invalid due date format. Must be ISO8601.")
    .toDate(),
];

exports.validateAddMember = [
  body("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID of the member to add is required.")
    .isString()
    .withMessage("User ID must be a string."),
  body("role")
    .optional()
    .trim()
    .isIn(Object.values(ProjectRole))
    .withMessage(
      `Invalid role. Must be one of: ${Object.values(ProjectRole).join(", ")}`
    ),
  param("projectId").isString().withMessage("Project ID must be a string."),
];

exports.validateUpdateMemberRole = [
  body("role")
    .trim()
    .notEmpty()
    .withMessage("Role is required.")
    .isIn(Object.values(ProjectRole))
    .withMessage(
      `Invalid role. Must be one of: ${Object.values(ProjectRole).join(", ")}`
    ),
  param("projectId").isString().withMessage("Project ID must be a string."),
  param("userId").isString().withMessage("User ID must be a string."),
];

exports.validateProjectId = [
  param("projectId")
    .isString()
    .withMessage("Project ID must be a string (CUID)."),
];

exports.validateProjectAndUserId = [
  param("projectId")
    .isString()
    .withMessage("Project ID must be a string (CUID)."),
  param("userId").isString().withMessage("User ID must be a string."),
];
