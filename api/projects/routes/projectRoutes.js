const express = require("express");
const projectController = require("../controllers/projectController");
const {
  validateProject,
  validateProjectUpdate,
  validateAddMember,
  validateUpdateMemberRole,
  validateProjectId,
  validateProjectAndUserId,
} = require("../middleware/validation/projectValidator");

const router = express.Router();

// === Trasy dla Projektów ===
router.post("/", validateProject, projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", validateProjectUpdate, projectController.updateProject);
router.delete("/:id", projectController.deleteProject);

// === Trasy dla Członków Projektu ===
router.post(
  "/:projectId/members",
  validateAddMember,
  projectController.addProjectMember
);

router.delete(
  "/:projectId/members/:userId",
  validateProjectAndUserId,
  projectController.removeProjectMember
);

router.put(
  "/:projectId/members/:userId",
  validateUpdateMemberRole,
  projectController.updateProjectMemberRole
);

router.get(
  "/:projectId/members",
  validateProjectId,
  projectController.getProjectMembers
);

// === Trasy dla Zadań w Projekcie ===
router.get(
  "/:projectId/tasks",
  validateProjectId,
  projectController.getProjectTasks
);

module.exports = router;
