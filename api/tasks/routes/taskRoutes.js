const express = require("express");
const taskController = require("../controllers/taskController");
const {
  validateTask,
  validateTaskUpdate,
  validateTaskDelete,
} = require("../middleware/validation/taskValidator");

const router = express.Router();

router.post("/", validateTask, taskController.createTask);

router.get("/", taskController.getTasks);

router.put("/", validateTaskUpdate, taskController.updateTask);

router.delete("/", validateTaskDelete, taskController.deleteTask);

module.exports = router;
