// index.js
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { setupKeycloak } = require("./middleware/auth");
const errorRoutes = require("./routes/errorRoutes");

const app = express();
const PORT = process.env.PORT || 3400;

// Połączenie z MongoDB
async function connectDB() {
  try {
    const mongoHost = process.env.MONGO_HOST || "mongodb";
    const mongoPort = process.env.MONGO_PORT || "27017";
    const mongoUser = process.env.MONGO_USER || "todoapp";
    const mongoDb = process.env.MONGO_DB || "tododb";
    const mongoPassword = process.env.MONGO_PASSWORD || "mongo123";

    const mongoUri = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDb}?authSource=admin`;

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", true);

// Konfiguracja Keycloak
setupKeycloak(app);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "error-service",
  });
});

// Trasy API
app.use("/api/errors", errorRoutes);

// Obsługa błędów
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start serwera
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Error Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start:", error);
    process.exit(1);
  }
}

start();
