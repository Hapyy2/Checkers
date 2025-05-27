const express = require("express");
const taskImportExportController = require("../controllers/taskImportExportController");
const multer = require("multer");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/export/json", taskImportExportController.exportTasksAsJson);
router.get("/export/csv", taskImportExportController.exportTasksAsCsv);

router.post(
  "/import/json",
  upload.single("jsonfile"),
  taskImportExportController.importTasksFromJson
);
router.post(
  "/import/csv",
  upload.single("csvfile"),
  taskImportExportController.importTasksFromCsv
);

module.exports = router;
