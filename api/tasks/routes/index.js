const express = require("express");
const taskRoutes = require("./taskRoutes");
const categoryRoutes = require("./categoryRoutes");
const taskImportExportRoutes = require("./taskImportExportRoutes");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: `Welcome to the ${process.env.SERVICE_NAME || "Tasks API"} - v1`,
  });
});

router.use("/tasks", taskRoutes);
router.use("/categories", categoryRoutes);
router.use("/tasks/port", taskImportExportRoutes);

module.exports = router;
