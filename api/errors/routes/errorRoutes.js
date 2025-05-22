// routes/errorRoutes.js - Zmodyfikowane trasy dla Error Service
const express = require("express");
const router = express.Router();
const errorController = require("../controllers/errorController");
const {
  serviceAccountAuth,
  adminAuth,
  userAuth,
  hasClientRole,
} = require("../middleware/auth");

// Health check endpoint - publiczny
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "error-service",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint do logowania błędów - chroniony dla service accounts
// Tutaj błędy mogą być zgłaszane przez inne serwisy (np. tasks-api)
router.post("/", serviceAccountAuth, errorController.logError);

// Endpointy do pobierania danych - chronione
router.get("/", userAuth, errorController.getErrors);
router.get("/stats", adminAuth, errorController.getStats);
router.get("/:id", userAuth, errorController.getErrorById);

// Endpointy administracyjne - tylko dla adminów
router.delete("/cleanup", adminAuth, errorController.cleanup);

// Endpoint testowy dla sprawdzenia uprawnień
router.get("/auth-info", userAuth, (req, res) => {
  const token = req.kauth?.grant?.access_token?.content || {};
  const clientId = process.env.KEYCLOAK_CLIENT_ID || "whattodo-app";

  res.json({
    clientId: token.azp || "unknown",
    username: token.preferred_username || "service-account",
    isServiceAccount: token.azp === clientId && !token.preferred_username,
    roles: {
      realm: token.realm_access?.roles || [],
      client: token.resource_access?.[clientId]?.roles || [],
    },
  });
});

module.exports = router;
