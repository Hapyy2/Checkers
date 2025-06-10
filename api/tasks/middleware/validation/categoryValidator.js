const { body } = require("express-validator");

exports.validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ min: 2, max: 50 }),
];

exports.validateCategoryUpdate = [
  body("id")
    .notEmpty()
    .isString()
    .withMessage("Category ID is required for update."),
  body("name")
    .notEmpty()
    .withMessage("Category name is required.")
    .trim()
    .isLength({ min: 2, max: 50 }),
];

exports.validateCategoryDelete = [
  body("id")
    .notEmpty()
    .isString()
    .withMessage("Category ID is required for deletion."),
];
