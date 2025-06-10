const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/summary", reportController.getTaskSummaryReport);

module.exports = router;
