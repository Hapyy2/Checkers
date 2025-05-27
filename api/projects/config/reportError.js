const axios = require("axios");
const { getAccessToken } = require("./keycloakAuth");

const API_GATEWAY_ERROR_ENDPOINT =
  process.env.API_GATEWAY_INTERNAL_ERROR_ENDPOINT;
const SERVICE_NAME = process.env.SERVICE_NAME || "projects-api";

async function reportError(error, requestContext = {}, additionalInfo = {}) {
  if (!API_GATEWAY_ERROR_ENDPOINT) {
    console.error(
      `CRITICAL [${SERVICE_NAME}]: API_GATEWAY_INTERNAL_ERROR_ENDPOINT is not defined. Error reporting disabled.`
    );
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error(
      `[${SERVICE_NAME}] Cannot report error: Failed to obtain M2M access token.`
    );
    return;
  }

  const errorPayload = {
    timestamp: new Date().toISOString(),
    sourceService: SERVICE_NAME,
    errorMessage: error.message || "An unknown error occurred in projects-api.",
    errorCode:
      error.code ||
      (error.response && error.response.status) ||
      "UNKNOWN_ERROR",
    requestDetails: {
      method: requestContext.method,
      url: requestContext.url,
      ipAddress: requestContext.ipAddress,
      userId: requestContext.userId,
    },
    stackTrace: error.stack,
    additionalContext: {
      ...additionalInfo,
      ...(error.isAxiosError && {
        axiosErrorDetails: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          status: error.response?.status,
          responseData: error.response?.data,
        },
      }),
      ...(error.meta && { prismaErrorMeta: error.meta }),
      ...(error.clientVersion && { prismaClientVersion: error.clientVersion }),
    },
  };

  try {
    console.log(`[${SERVICE_NAME}] Reporting error to API Gateway...`);
    await axios.post(API_GATEWAY_ERROR_ENDPOINT, errorPayload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 5000,
    });
    console.log(
      `[${SERVICE_NAME}] Error successfully reported via API Gateway.`
    );
  } catch (reportingError) {
    let logMessage = `[${SERVICE_NAME}] Failed to report error via API Gateway. Endpoint: ${API_GATEWAY_ERROR_ENDPOINT}.`;
    if (reportingError.response) {
      logMessage += ` Status: ${
        reportingError.response.status
      }. Response: ${JSON.stringify(reportingError.response.data)}.`;
      if (reportingError.response.status === 401) {
        logMessage += ` M2M token might be invalid or expired.`;
      }
    } else if (reportingError.request) {
      logMessage += ` No response received from API Gateway.`;
    } else {
      logMessage += ` Error details: ${reportingError.message}.`;
    }
    console.error(logMessage, {
      originalError: {
        message: error.message,
        stack: error.stack?.substring(0, 500),
      },
      payloadSent: errorPayload,
    });
  }
}

module.exports = reportError;
