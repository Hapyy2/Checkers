require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/db");
const errorRoutes = require("./routes/errorRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json()); // To parse JSON bodies

// Routes
app.use("/api/errors", errorRoutes);

// Basic Central Error Handler for THIS service (errors-api itself)
app.use((err, req, res, next) => {
  console.error("Unhandled error in errors-api:", err.stack);
  // Avoid sending the error to itself here, as that could cause a loop.
  // For now, just send a generic response.
  if (!res.headersSent) {
    res.status(500).send({
      message: "An unexpected internal error occurred within the errors-api.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(
    `Errors API running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
