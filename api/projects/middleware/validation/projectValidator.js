const { body, query } = require("express-validator");
const { ProjectRole } = require("@prisma/client");

exports.validateProjectCreate = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Project name is required.")
    .isLength({ min: 3, max: 100 }),
  body("description").optional().trim().isLength({ max: 500 }),
  body("dueDate").optional({ checkFalsy: true }).isISO8601().toDate(),
];

exports.validateProjectUpdate = [
  body("id")
    .notEmpty()
    .isString()
    .withMessage("Project ID is required for update."),
  body("name").optional().trim().notEmpty().isLength({ min: 3, max: 100 }),
  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }),
  body("dueDate").optional({ checkFalsy: true }).isISO8601().toDate(),
];

exports.validateProjectDelete = [
  body("id")
    .notEmpty()
    .isString()
    .withMessage("Project ID is required for deletion."),
];

exports.validateAddMember = [
  body("projectId")
    .notEmpty()
    .isString()
    .withMessage("Project ID is required."),
  body("userId").notEmpty().isString().withMessage("User ID is required."),
  body("role").optional().trim().isIn(Object.values(ProjectRole)),
];

exports.validateUpdateMember = [
  body("projectId")
    .notEmpty()
    .isString()
    .withMessage("Project ID is required."),
  body("userId").notEmpty().isString().withMessage("User ID is required."),
  body("role")
    .notEmpty()
    .withMessage("Role is required.")
    .trim()
    .isIn(Object.values(ProjectRole)),
];

exports.validateRemoveMember = [
  body("projectId")
    .notEmpty()
    .isString()
    .withMessage("Project ID is required."),
  body("userId").notEmpty().isString().withMessage("User ID is required."),
];
