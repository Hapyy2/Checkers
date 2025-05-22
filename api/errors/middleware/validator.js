const { body, query } = require("express-validator");

exports.validateErrorLog = [
  body("sourceService")
    .trim()
    .notEmpty()
    .withMessage("Source service is required.")
    .isString()
    .withMessage("Source service must be a string."),
  body("errorMessage")
    .trim()
    .notEmpty()
    .withMessage("Error message is required.")
    .isString()
    .withMessage("Error message must be a string."),
  body("timestamp")
    .optional()
    .isISO8601()
    .withMessage("Timestamp must be a valid ISO 8601 date.")
    .toDate(),
  body("errorCode")
    .optional()
    .isString()
    .withMessage("Error code must be a string."),
  body("requestDetails")
    .optional()
    .isObject()
    .withMessage("Request details must be an object."),
  body("requestDetails.method")
    .optional()
    .isString()
    .withMessage("Request method must be a string."),
  body("requestDetails.url")
    .optional()
    .isString()
    .withMessage("Request URL must be a string."),
  body("requestDetails.userId")
    .optional()
    .isString()
    .withMessage("Request user ID must be a string."),
  body("requestDetails.ipAddress")
    .optional()
    .isIP()
    .withMessage("Request IP address must be a valid IP address."),
  body("stackTrace")
    .optional()
    .isString()
    .withMessage("Stack trace must be a string."),
  body("additionalContext")
    .optional()
    .isObject()
    .withMessage("Additional context must be an object."),
];

exports.validateGetErrorsQuery = [
  query("sourceService")
    .optional()
    .isString()
    .withMessage("sourceService must be a string."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100.")
    .toInt(),
  query("sortOrder")
    .optional()
    .isIn(["newest", "oldest"])
    .withMessage('sortOrder must be either "newest" or "oldest".'),
];
