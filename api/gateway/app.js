const express = require("express");
const session = require("express-session");
const Keycloak = require("keycloak-connect");
const helmet = require("helmet");
require("dotenv").config();

console.log("DEBUG environment variable in API Gateway:", process.env.DEBUG);

const app = express();

app.use(helmet());

const memoryStore = new session.MemoryStore();
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  })
);

const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM,
  "auth-server-url": process.env.KEYCLOAK_AUTH_SERVER_URL,
  "ssl-required": "external",
  resource: process.env.API_GATEWAY_CLIENT_ID,
  credentials: {
    secret: process.env.API_GATEWAY_CLIENT_SECRET,
  },
  "bearer-only": true,
  "confidential-port": 0,
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

app.use(keycloak.middleware());

// ----- Definicje Tras -----

// Trasa publiczna
app.get("/api/public", (req, res) => {
  res.json({ message: "To jest publiczny endpoint. Token nie jest wymagany." });
});

// Trasa chroniona - przykład z rozszerzonym logowaniem
app.get("/api/protected", keycloak.protect(), (req, res, next) => {
  console.log("--- API GATEWAY: In /api/protected route handler ---");
  if (req.kauth && req.kauth.grant) {
    console.log(
      "--- API GATEWAY: Keycloak grant object IS PRESENT. Token content:"
    );
    console.log(JSON.stringify(req.kauth.grant.access_token.content, null, 2));
    const userInfo = req.kauth.grant.access_token.content;
    res.json({
      message: "To jest chroniony endpoint. Wymagany jest ważny token.",
      user: {
        id: userInfo.sub,
        username: userInfo.preferred_username,
        email: userInfo.email,
        roles: userInfo.realm_access.roles,
      },
    });
  } else {
    console.error(
      "--- API GATEWAY ERROR: Keycloak grant object IS MISSING after protect() middleware ---"
    );
    res.status(500).json({
      error:
        "Internal Server Error: Grant object missing after Keycloak protection.",
    });
  }
});

// Trasa chroniona - tylko użytkownicy z rolą 'admin' (realm role)
app.get("/api/admin", keycloak.protect("realm:admin"), (req, res) => {
  const userInfo = req.kauth.grant.access_token.content;
  res.json({
    message: 'To jest endpoint dla administratora. Wymagana rola "admin".',
    adminInfo: userInfo,
  });
});

// ----- Uruchomienie serwera -----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Gateway nasłuchuje na porcie ${PORT}`);
  console.log(
    `Keycloak dostępny pod adresem: ${process.env.KEYCLOAK_AUTH_SERVER_URL}`
  );
  console.log(`Realm używany przez API Gateway: ${process.env.KEYCLOAK_REALM}`);
  console.log(
    `Client ID API Gateway (M2M): ${process.env.API_GATEWAY_M2M_CLIENT_ID}`
  );
});
