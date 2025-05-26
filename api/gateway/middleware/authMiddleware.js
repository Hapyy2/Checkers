const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const keycloakRealmUrl = `${process.env.API_GATEWAY_KEYCLOAK_URL}/realms/${process.env.API_GATEWAY_KEYCLOAK_REALM}`;

if (
  !process.env.API_GATEWAY_KEYCLOAK_URL ||
  !process.env.API_GATEWAY_KEYCLOAK_REALM ||
  !process.env.API_GATEWAY_KEYCLOAK_ISSUER ||
  !process.env.API_GATEWAY_KEYCLOAK_AUDIENCE
) {
  throw new Error(
    "Missing Keycloak configuration for API Gateway in .env file."
  );
}

const client = jwksClient({
  jwksUri: `${keycloakRealmUrl}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      console.error("Error fetching signing key:", err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No token provided or malformed token." });
  }

  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getKey,
    {
      audience: process.env.API_GATEWAY_KEYCLOAK_AUDIENCE,
      issuer: process.env.API_GATEWAY_KEYCLOAK_ISSUER,
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("Token verification error:", err.message);
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ message: "Unauthorized: Token has expired." });
        }
        if (err.name === "JsonWebTokenError") {
          return res
            .status(401)
            .json({ message: `Unauthorized: Invalid token - ${err.message}` });
        }
        return res
          .status(401)
          .json({ message: "Unauthorized: Invalid token." });
      }
      req.auth = decoded;
      next();
    }
  );
};

module.exports = authenticateToken;
