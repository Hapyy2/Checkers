// middleware/auth.js - Error Service
const Keycloak = require("keycloak-connect");
const session = require("express-session");

// Konfiguracja sesji
const memoryStore = new session.MemoryStore();
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "error-service-secret",
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

console.log(
  "Keycloak config in Error Service:",
  JSON.stringify(keycloakConfig, null, 2)
);

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Specjalny middleware do debugowania tokenów
const debugToken = (req, res, next) => {
  console.log("Request headers in Error Service:", req.headers);

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

// Middleware dla autentykacji service account
const serviceAccountAuth = (req, res, next) => {
  debugToken(req, res, () => {
    // Spróbuj standardową autentykację Keycloak
    keycloak.protect()(req, res, (err) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(401).json({ error: "Authentication failed" });
      }

      // Po autentykacji, sprawdź token
      const token = req.kauth?.grant?.access_token?.content;

      if (!token) {
        return res.status(401).json({ error: "Invalid token format" });
      }

      // Dodaj informację o tokenie do req dla dalszego użytku
      req.serviceToken = token;

      // Sprawdź czy to klient, który ma uprawnienia do tego endpointu
      const clientId = keycloakConfig.resource;

      // Sprawdź czy token ma rolę errors-reader
      if (token.resource_access?.[clientId]?.roles?.includes("errors-reader")) {
        return next();
      }

      // Sprawdź inne potencjalne role z realmu
      if (token.realm_access?.roles?.includes("admin")) {
        return next();
      }

      return res.status(403).json({ error: "Insufficient permissions" });
    });
  });
};

// Middleware dla administratorów
const adminAuth = [
  debugToken,
  keycloak.protect((token) => token.hasRealmRole("admin")),
];

// Middleware dla użytkowników
const userAuth = [
  debugToken,
  keycloak.protect(
    (token) => token.hasRealmRole("user") || token.hasRealmRole("admin")
  ),
];

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

// Publikowanie metadanych uwierzytelnienia do frontendu
const authInfo = (req, res) => {
  if (!req.kauth || !req.kauth.grant) {
    return res.status(401).json({ authenticated: false });
  }

  const token = req.kauth.grant.access_token.content;
  const clientId = keycloakConfig.resource;

  res.json({
    authenticated: true,
    username: token.preferred_username || token.azp,
    roles: token.realm_access?.roles || [],
    clientRoles: token.resource_access?.[clientId]?.roles || [],
  });
};

module.exports = {
  setupKeycloak,
  serviceAccountAuth,
  adminAuth,
  userAuth,
  hasClientRole,
  authInfo,
};
