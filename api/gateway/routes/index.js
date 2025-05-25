const express = require("express");
const errorServiceProxyHandler = require("./errorServiceProxy");

const router = express.Router();

const ERROR_SERVICE_URL = process.env.ERROR_SERVICE_INTERNAL_URL;

if (ERROR_SERVICE_URL) {
  router.use("/gw/errors", errorServiceProxyHandler(ERROR_SERVICE_URL));
  console.log(
    `Error Service proxy enabled for /gw/errors, targeting ${ERROR_SERVICE_URL}`
  );
} else {
  console.warn(
    "ERROR_SERVICE_INTERNAL_URL not defined. Error Service proxy is disabled."
  );
}

router.get("/health", (req, res) => {
  res.json({
    message: "API Gateway is operational.",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
