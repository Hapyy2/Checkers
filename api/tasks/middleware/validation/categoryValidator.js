const { body } = require("express-validator");

exports.validateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters."),
];
