const axios = require("axios");
const qs = require("qs");

const KEYCLOAK_URL_ENV = process.env.TASKS_API_KEYCLOAK_URL;
const REALM_ENV = process.env.TASKS_API_KEYCLOAK_REALM;
const CLIENT_ID_ENV = process.env.TASKS_API_CLIENT_ID;
const CLIENT_SECRET_ENV = process.env.TASKS_API_CLIENT_SECRET;

console.log(
  `[keycloakAuth.js] Initializing with KEYCLOAK_URL: ${KEYCLOAK_URL_ENV}, REALM: ${REALM_ENV}, CLIENT_ID: ${CLIENT_ID_ENV}`
);

let tokenInfo = {
  accessToken: null,
  expiresAt: 0,
};

async function getAccessToken() {
  if (tokenInfo.accessToken && Date.now() < tokenInfo.expiresAt) {
    return tokenInfo.accessToken;
  }

  if (!KEYCLOAK_URL_ENV || !REALM_ENV || !CLIENT_ID_ENV || !CLIENT_SECRET_ENV) {
    console.error(
      "[keycloakAuth.js] Cannot fetch M2M token: Keycloak client configuration is incomplete. Check environment variables (TASKS_API_KEYCLOAK_URL, _REALM, _CLIENT_ID, _CLIENT_SECRET)."
    );
    return null;
  }

  const tokenEndpoint = `${KEYCLOAK_URL_ENV}/realms/${REALM_ENV}/protocol/openid-connect/token`;
  console.log(
    `[keycloakAuth.js] Attempting to fetch M2M token from endpoint: ${tokenEndpoint}`
  );

  const requestBody = {
    grant_type: "client_credentials",
    client_id: CLIENT_ID_ENV,
    client_secret: CLIENT_SECRET_ENV,
  };

  try {
    console.log(
      `[${CLIENT_ID_ENV}] Fetching new M2M access token from Keycloak...`
    );
    const response = await axios.post(
      tokenEndpoint,
      qs.stringify(requestBody),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      }
    );
    const { access_token, expires_in } = response.data;
    tokenInfo.accessToken = access_token;
    tokenInfo.expiresAt = Date.now() + (expires_in - 30) * 1000;
    console.log(`[${CLIENT_ID_ENV}] New M2M access token obtained.`);
    return tokenInfo.accessToken;
  } catch (error) {
    console.error(
      `[${
        CLIENT_ID_ENV || "tasks-service"
      }] Failed to fetch M2M access token from ${tokenEndpoint}:`,
      error.isAxiosError && error.message
        ? error.message
        : error.response
        ? error.response.data
        : error
    );
    if (error.isAxiosError && error.code) {
      console.error(
        `[${CLIENT_ID_ENV || "tasks-service"}] Axios error code: ${error.code}`
      );
    }
    tokenInfo.accessToken = null;
    tokenInfo.expiresAt = 0;
    return null;
  }
}

module.exports = { getAccessToken };
