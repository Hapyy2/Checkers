// index.js
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const { PrismaClient } = require("@prisma/client");
const { setupKeycloak } = require("./middleware/auth");
const taskRoutes = require("./routes/taskRoutes");
const errorReporter = require("./utils/errorReporter");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3100;

// Podstawowe middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", true);

// Konfiguracja Keycloak
setupKeycloak(app);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "tasks-service",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

// Trasy API
app.use("/api/tasks", taskRoutes);

// Obsługa 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Prosta obsługa błędów
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start serwera
const server = app.listen(PORT, () => {
  console.log(`Tasks API running on port ${PORT}`);

  // Inicjalizuj error reporter z opóźnieniem
  setTimeout(async () => {
    try {
      await errorReporter.connect();
      console.log("Services initialization complete");
    } catch (error) {
      console.error("Services initialization failed:", error);
    }
  }, 15000); // Daj 15 sekund na start Keycloak
});

// Obsługa zamknięcia
process.on("SIGTERM", async () => {
  console.log("SIGTERM received");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
