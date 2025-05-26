const express = require("express");
const categoryController = require("../controllers/categoryController");
const {
  validateCategory,
} = require("../middleware/validation/categoryValidator");

const router = express.Router();

router.post("/", validateCategory, categoryController.createCategory);

router.get("/", categoryController.getCategoriesByUser);

router.put("/:id", validateCategory, categoryController.updateCategory);

router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
