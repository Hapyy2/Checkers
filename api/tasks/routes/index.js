const express = require("express");
const taskRoutes = require("./taskRoutes");
const categoryRoutes = require("./categoryRoutes");
const taskImportRoute = require("./taskImportRoute");
const taskExportRoute = require("./taskExportRoute");
const reportRoutes = require("./reportRoutes");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    message: `Welcome to the ${process.env.SERVICE_NAME || "Tasks API"}`,
  });
});

router.use("/tasks", taskRoutes);
router.use("/categories", categoryRoutes);

router.use("/import", taskImportRoute);
router.use("/export", taskExportRoute);
router.use("/reports", reportRoutes);

module.exports = router;
