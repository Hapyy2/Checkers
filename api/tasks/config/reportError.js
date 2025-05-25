const axios = require("axios");

const API_GATEWAY_ERROR_ENDPOINT =
  process.env.API_GATEWAY_INTERNAL_ERROR_ENDPOINT;
const SERVICE_NAME = process.env.SERVICE_NAME || "tasks-api";

async function reportError(error, requestContext = {}, additionalInfo = {}) {
  if (!API_GATEWAY_ERROR_ENDPOINT) {
    console.error(
      "CRITICAL: API_GATEWAY_INTERNAL_ERROR_ENDPOINT is not defined. Cannot report error to central service.",
      { error: error.message, requestContext, additionalInfo }
    );
    return;
  }

  const errorPayload = {
    timestamp: new Date().toISOString(),
    sourceService: SERVICE_NAME,
    errorMessage: error.message,
    errorCode:
      error.code || (error.isOperational ? error.type : "UNHANDLED_EXCEPTION"),
    requestDetails: {
      method: requestContext.method,
      url: requestContext.url,
      userId: requestContext.userId,
    },
    stackTrace: error.stack,
    additionalContext: {
      ...additionalInfo,
      isOperational: error.isOperational === true,
      errorName: error.name,
    },
  };

  try {
    console.log(`Reporting error from ${SERVICE_NAME} to API Gateway...`);
    await axios.post(API_GATEWAY_ERROR_ENDPOINT, errorPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
    console.log(`Error successfully reported by ${SERVICE_NAME}.`);
  } catch (reportingError) {
    console.error(
      `Failed to report error from ${SERVICE_NAME} to API Gateway. Endpoint: ${API_GATEWAY_ERROR_ENDPOINT}`,
      {
        originalError: error.message,
        reportingError: reportingError.message,
        payloadSent: errorPayload,
      }
    );
  }
}

module.exports = reportError;
