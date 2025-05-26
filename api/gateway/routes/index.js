const express = require("express");
const errorServiceProxyHandler = require("./errorServiceProxy");
const authenticateToken = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnlyMiddleware");
const authenticateServiceToken = require("../middleware/authenticateServiceToken");
const tasksServiceProxyHandler = require("./tasksServiceProxy");

const router = express.Router();
const ERROR_SERVICE_URL = process.env.ERROR_SERVICE_INTERNAL_URL;
const TASKS_SERVICE_URL = process.env.TASKS_API_INTERNAL_URL;

router.get("/health", (req, res) => {
  res.json({
    message: "API Gateway is operational.",
    timestamp: new Date().toISOString(),
  });
});

if (ERROR_SERVICE_URL) {
  const errorProxy = errorServiceProxyHandler(ERROR_SERVICE_URL);

  router.get("/gw/errors", authenticateToken, adminOnly, errorProxy);
  console.log(
    `Error Service GET /gw/errors proxy enabled (ADMIN ONLY), targeting ${ERROR_SERVICE_URL}/api/errors`
  );
  router.post("/gw/errors/log", authenticateServiceToken, errorProxy);
  console.log(
    `Error Service POST /gw/errors/log proxy enabled (SERVICE TOKEN AUTH), targeting ${ERROR_SERVICE_URL}/api/errors/log`
  );
  router.get("/gw/errors/health", authenticateToken, errorProxy);
  console.log(
    `Error Service GET /gw/errors/health proxy enabled (AUTHENTICATED USER), targeting ${ERROR_SERVICE_URL}/api/errors/health`
  );
} else {
  console.warn(
    "ERROR_SERVICE_INTERNAL_URL not defined. Error Service proxy is disabled."
  );
}

if (TASKS_SERVICE_URL) {
  const tasksProxy = tasksServiceProxyHandler(TASKS_SERVICE_URL);
  router.use("/gw/tasks", authenticateToken, tasksProxy);
  console.log(
    `Tasks Service proxy enabled for /gw/tasks, targeting ${TASKS_SERVICE_URL}`
  );
} else {
  console.warn(
    "TASKS_API_INTERNAL_URL not defined. Tasks Service proxy is disabled."
  );
}

module.exports = router;
