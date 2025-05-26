const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const keycloakRealmUrl = `${process.env.API_GATEWAY_KEYCLOAK_URL}/realms/${process.env.API_GATEWAY_KEYCLOAK_REALM}`;
if (
  !process.env.API_GATEWAY_KEYCLOAK_URL ||
  !process.env.API_GATEWAY_KEYCLOAK_REALM ||
  !process.env.API_GATEWAY_KEYCLOAK_ISSUER
) {
  throw new Error(
    "Missing Keycloak configuration for API Gateway (service token auth) in .env file."
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
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

const authenticateServiceToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized (Service): No token provided or malformed token.",
    });
  }
  const token = authHeader.substring(7);

  jwt.verify(
    token,
    getKey,
    {
      issuer: process.env.API_GATEWAY_KEYCLOAK_ISSUER,
      algorithms: ["RS256"],
    },
    (err, decoded) => {
      if (err) {
        console.error("Service Token verification error:", err.message);
        return res.status(401).json({
          message: `Unauthorized (Service): Invalid token - ${err.message}`,
        });
      }

      if (
        !decoded.realm_access ||
        !decoded.realm_access.roles ||
        !decoded.realm_access.roles.includes("service-role")
      ) {
        console.warn(
          `Service token for '${
            decoded.azp || decoded.clientId || decoded.sub
          }' missing 'service-role'.`
        );
        return res.status(403).json({
          message: "Forbidden (Service): Missing required service role.",
        });
      }

      req.serviceAuth = {
        clientId: decoded.azp || decoded.clientId,
        sub: decoded.sub,
        roles: decoded.realm_access.roles,
      };
      console.log(
        `Service call authenticated: ${
          req.serviceAuth.clientId || req.serviceAuth.sub
        }`
      );
      next();
    }
  );
};

module.exports = authenticateServiceToken;
