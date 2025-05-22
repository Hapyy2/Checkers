// middleware/auth.js
const Keycloak = require("keycloak-connect");
const session = require("express-session");

// Konfiguracja sesji
const memoryStore = new session.MemoryStore();
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "tasks-api-secret",
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
};

// Konfiguracja Keycloak - używamy tego samego adresu co w tokenie 'iss'
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || "whattodo",
  "auth-server-url": process.env.KEYCLOAK_URL || "http://localhost/auth",
  resource: process.env.KEYCLOAK_CLIENT_ID || "whattodo-app",
  "bearer-only": true,
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || "whattodo-client-secret",
  },
  "verify-token-audience": false,
  "confidential-port": 0,
  "use-resource-role-mappings": true,
  "enable-logging": true,
  "ssl-required": "external",
};

// Logujemy konfigurację dla celów debugowania
console.log("Keycloak config:", JSON.stringify(keycloakConfig, null, 2));

// Inicjalizacja Keycloak
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Specjalny middleware do debugowania tokenów
const debugToken = (req, res, next) => {
  console.log("Request headers:", req.headers);

  const authHeader = req.headers.authorization;
  if (authHeader) {
    console.log("Auth header present:", authHeader.substring(0, 15) + "...");
  } else {
    console.log("Auth header missing");
  }

  if (req.kauth && req.kauth.grant) {
    const token = req.kauth.grant.access_token.content;
    console.log(
      "Token content:",
      JSON.stringify(
        {
          iss: token.iss,
          sub: token.sub,
          aud: token.aud,
          exp: token.exp,
          roles: token.realm_access?.roles,
          clientRoles: token.resource_access?.[keycloakConfig.resource]?.roles,
        },
        null,
        2
      )
    );
  } else {
    console.log("No token parsed from request");
  }

  next();
};

// Konfiguracja Keycloak dla Express
const setupKeycloak = (app) => {
  app.use(session(sessionConfig));
  app.use(keycloak.middleware());
};

// Middleware ochrony trasy - bez żadnych wymogów dot. ról
const protect = () => {
  return [debugToken, keycloak.protect()];
};

// Middleware sprawdzania roli
const hasRole = (roleName) => {
  return [
    debugToken,
    keycloak.protect((token) => {
      console.log("Checking realm role:", roleName);
      const hasRole = token.hasRealmRole(roleName);
      console.log("Has role?", hasRole);
      return hasRole;
    }),
  ];
};

// Middleware sprawdzania roli klienta
const hasClientRole = (roleName) => {
  return [
    debugToken,
    keycloak.protect((token) => {
      const clientId = keycloakConfig.resource;
      console.log("Checking client role:", roleName, "for client:", clientId);
      const hasRole = token.hasRole(clientId, roleName);
      console.log("Has client role?", hasRole);
      return hasRole;
    }),
  ];
};

// Helper do pobierania ID użytkownika
const getUserId = (req) => {
  if (req.kauth && req.kauth.grant) {
    return req.kauth.grant.access_token.content.sub;
  }
  return null;
};

module.exports = {
  keycloak,
  setupKeycloak,
  protect,
  hasRole,
  hasClientRole,
  getUserId,
};
