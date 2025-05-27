const axios = require("axios");
const qs = require("qs");

const KEYCLOAK_URL_ENV = process.env.PROJECTS_API_KEYCLOAK_URL;
const REALM_ENV = process.env.PROJECTS_API_KEYCLOAK_REALM;
const CLIENT_ID_ENV = process.env.PROJECTS_API_CLIENT_ID;
const CLIENT_SECRET_ENV = process.env.PROJECTS_API_CLIENT_SECRET;

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
      `[projects-api keycloakAuth.js] Cannot fetch M2M token: Keycloak client configuration is incomplete. Check PROJECTS_API_... env variables.`
    );
    return null;
  }

  const tokenEndpoint = `${KEYCLOAK_URL_ENV}/realms/${REALM_ENV}/protocol/openid-connect/token`;

  const requestBody = {
    grant_type: "client_credentials",
    client_id: CLIENT_ID_ENV,
    client_secret: CLIENT_SECRET_ENV,
  };

  try {
    console.log(
      `[${CLIENT_ID_ENV}] Fetching new M2M access token from Keycloak for projects-api...`
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
    console.log(
      `[${CLIENT_ID_ENV}] New M2M access token obtained for projects-api.`
    );
    return tokenInfo.accessToken;
  } catch (error) {
    console.error(
      `[${
        CLIENT_ID_ENV || "projects-service"
      }] Failed to fetch M2M access token from ${tokenEndpoint} for projects-api:`,
      error.isAxiosError && error.message
        ? error.message
        : error.response
        ? JSON.stringify(error.response.data)
        : error.toString()
    );
    if (error.isAxiosError && error.code) {
      console.error(
        `[${CLIENT_ID_ENV || "projects-service"}] Axios error code: ${
          error.code
        }`
      );
    }
    tokenInfo.accessToken = null;
    tokenInfo.expiresAt = 0;
    return null;
  }
}

module.exports = { getAccessToken };
