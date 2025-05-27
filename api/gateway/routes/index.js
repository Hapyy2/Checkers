const express = require("express");
const errorServiceProxyHandler = require("./errorServiceProxy");
const authenticateToken = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnlyMiddleware");
const authenticateServiceToken = require("../middleware/authenticateServiceToken");
const tasksServiceProxyHandler = require("./tasksServiceProxy");
const projectsServiceProxyHandler = require("./projectsServiceProxy");

const router = express.Router();

const ERROR_SERVICE_URL = process.env.ERROR_SERVICE_INTERNAL_URL;
const TASKS_SERVICE_URL = process.env.TASKS_API_INTERNAL_URL;
const PROJECTS_SERVICE_URL = process.env.PROJECTS_API_INTERNAL_URL;

router.get("/health", (req, res) => {
  res.json({
    message: "API Gateway is operational.",
    timestamp: new Date().toISOString(),
    proxiedServices: {
      tasks: TASKS_SERVICE_URL ? "configured" : "not configured",
      errors: ERROR_SERVICE_URL ? "configured" : "not configured",
      projects: PROJECTS_SERVICE_URL ? "configured" : "not configured",
    },
  });
});

if (ERROR_SERVICE_URL) {
  const errorProxy = errorServiceProxyHandler(ERROR_SERVICE_URL);
  router.get("/gw/errors", authenticateToken, adminOnly, errorProxy);
  router.post("/gw/errors/log", authenticateServiceToken, errorProxy);
  router.get("/gw/errors/health", authenticateToken, errorProxy);
  console.log(
    `Error Service proxy routes enabled, targeting ${ERROR_SERVICE_URL}`
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

if (PROJECTS_SERVICE_URL) {
  const projectsProxy = projectsServiceProxyHandler(PROJECTS_SERVICE_URL);
  router.use("/gw/projects", authenticateToken, projectsProxy);
  console.log(
    `Projects Service proxy enabled for /gw/projects, targeting ${PROJECTS_SERVICE_URL}`
  );
} else {
  console.warn(
    "PROJECTS_API_INTERNAL_URL not defined. Projects Service proxy is disabled."
  );
}

module.exports = router;
