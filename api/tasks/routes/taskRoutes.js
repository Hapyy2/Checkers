// routes/taskRoutes.js
const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const taskValidators = require("../validators/taskValidator");
const { protect, hasRole, hasClientRole } = require("../middleware/auth");

// Endpoint publiczny
router.get("/public-test", (req, res) => {
  res.json({ message: "Publiczny endpoint - działa bez autoryzacji!" });
});

// Endpoint z podstawową ochroną - bez ról
router.get("/auth-test", protect(), (req, res) => {
  // W tym przypadku wystarczy, że użytkownik jest zalogowany, nie sprawdzamy ról
  if (!req.kauth || !req.kauth.grant) {
    return res.status(401).json({ error: "No token found" });
  }

  const token = req.kauth.grant.access_token.content;
  const clientId = process.env.KEYCLOAK_CLIENT_ID || "whattodo-app";

  res.json({
    message: "Autoryzacja działa poprawnie!",
    user: token.preferred_username || "Brak info o użytkowniku",
    subject: token.sub,
    roles: token.realm_access?.roles || [],
    clientRoles: token.resource_access?.[clientId]?.roles || [],
    tokenInfo: {
      iss: token.iss,
      sub: token.sub,
      aud: token.aud,
      exp: token.exp,
      iat: token.iat,
    },
  });
});

// Test endpointu z rolą realm (user)
router.get("/role-user-test", hasRole("user"), (req, res) => {
  res.json({
    message: "Masz uprawnienia użytkownika (rola realm 'user')!",
  });
});

// Test endpointu z rolą realm (admin)
router.get("/role-admin-test", hasRole("admin"), (req, res) => {
  res.json({
    message: "Masz uprawnienia administratora (rola realm 'admin')!",
  });
});

// Test endpointu z rolą klienta
router.get("/client-role-test", hasClientRole("tasks-reader"), (req, res) => {
  res.json({
    message: "Masz uprawnienie 'tasks-reader' dla klienta!",
  });
});

// Standardowe trasy dla każdego zalogowanego użytkownika
router.get("/", protect(), taskValidators.getTasks, taskController.getTasks);
router.get(
  "/:id",
  protect(),
  taskValidators.getTaskById,
  taskController.getTaskById
);
router.post(
  "/",
  protect(),
  taskValidators.createTask,
  taskController.createTask
);

// Trasy wymagające właściciela zadania lub admina
router.put(
  "/:id",
  protect(),
  taskValidators.updateTask,
  taskController.updateTask
);
router.patch(
  "/:id",
  protect(),
  taskValidators.partialUpdateTask,
  taskController.partialUpdateTask
);
router.delete(
  "/:id",
  protect(),
  taskValidators.deleteTask,
  taskController.deleteTask
);

// Specjalne endpointy z kontrolą dostępu
router.patch(
  "/:id/status",
  protect(),
  taskValidators.updateTaskStatus,
  taskController.updateTaskStatus
);
router.patch(
  "/:id/priority",
  protect(),
  taskValidators.updateTaskPriority,
  taskController.updateTaskPriority
);
router.patch(
  "/:id/assign",
  hasRole("admin"),
  taskValidators.assignTask,
  taskController.assignTask
);

// Endpointy administracyjne
router.get("/admin/all-tasks", hasRole("admin"), taskController.getAllTasks);

module.exports = router;
