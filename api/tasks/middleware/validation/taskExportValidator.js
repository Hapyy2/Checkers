const { body } = require("express-validator");

exports.validateExportRequest = [
  body("format")
    .notEmpty()
    .withMessage("Format (csv or json) is required.")
    .isIn(["csv", "json"])
    .withMessage("Unsupported format. Must be 'csv' or 'json'."),
  body("filters").optional().isObject(),
];
