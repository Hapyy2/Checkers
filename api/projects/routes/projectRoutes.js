const express = require("express");
const projectController = require("../controllers/projectController");
const {
  validateProjectCreate,
  validateProjectUpdate,
  validateProjectDelete,
  validateAddMember,
  validateUpdateMember,
  validateRemoveMember,
} = require("../middleware/validation/projectValidator");

const router = express.Router();

// --- Trasy dla zasobu Projekt ---
router.post("/", validateProjectCreate, projectController.createProject);
router.get("/", projectController.getProjects);
router.put("/", validateProjectUpdate, projectController.updateProject);
router.delete("/", validateProjectDelete, projectController.deleteProject);

// --- Trasy dla pod-zasobów ---
router.get("/tasks", projectController.getProjectTasks);
router.get("/members", projectController.getProjectMembers);
router.post("/members", validateAddMember, projectController.addProjectMember);
router.put(
  "/members",
  validateUpdateMember,
  projectController.updateProjectMemberRole
);
router.delete(
  "/members",
  validateRemoveMember,
  projectController.removeProjectMember
);

module.exports = router;
