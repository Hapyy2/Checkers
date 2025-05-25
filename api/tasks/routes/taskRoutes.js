const express = require("express");
const taskController = require("../controllers/taskController");
const { validateTask } = require("../middleware/validation/taskValidator");

const router = express.Router();

router.post("/", validateTask, taskController.createTask);

router.get("/", taskController.getAllTasks);

router.get("/:id", taskController.getTaskById);

router.put("/:id", validateTask, taskController.updateTask);

router.delete("/:id", taskController.deleteTask);

module.exports = router;
