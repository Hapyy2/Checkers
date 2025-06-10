const express = require("express");
const categoryController = require("../controllers/categoryController");
const {
  validateCategory,
  validateCategoryUpdate,
  validateCategoryDelete,
} = require("../middleware/validation/categoryValidator");

const router = express.Router();

router.post("/", validateCategory, categoryController.createCategory);

router.get("/", categoryController.getCategories);

router.put("/", validateCategoryUpdate, categoryController.updateCategory);

router.delete("/", validateCategoryDelete, categoryController.deleteCategory);

module.exports = router;
