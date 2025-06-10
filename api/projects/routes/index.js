const express = require("express");
const projectRoutes = require("./projectRoutes");
const router = express.Router();

router.get("/info", (req, res) => {
  res.json({
    message: `Welcome to the ${
      process.env.SERVICE_NAME || "Projects API"
    } - v1`,
  });
});

router.use("/projects", projectRoutes);

module.exports = router;
