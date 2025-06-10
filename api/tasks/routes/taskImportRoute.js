const express = require("express");
const multer = require("multer");
const taskImportController = require("../controllers/taskImportController");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /import - inteligentnie obsługuje import z pliku
router.post(
  "/",
  upload.single("file"),
  taskImportController.importTasksFromFile
);

module.exports = router;
