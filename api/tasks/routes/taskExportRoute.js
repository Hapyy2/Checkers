const express = require("express");
const taskExportController = require("../controllers/taskExportController");
const {
  validateExportRequest,
} = require("../middleware/validation/taskExportValidator");

const router = express.Router();

router.post("/", validateExportRequest, taskExportController.requestExport);

router.get("/download/:exportId", taskExportController.downloadExportFile);

module.exports = router;
