const { createProxyMiddleware } = require("http-proxy-middleware");

const errorServiceProxy = (errorServiceUrl) => {
  if (!errorServiceUrl) {
    throw new Error("ERROR_SERVICE_INTERNAL_URL is not defined");
  }

  return createProxyMiddleware({
    target: errorServiceUrl,
    changeOrigin: true,
    pathRewrite: {
      "^/gw/errors": "/api/errors",
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `Proxying request to Error Service: ${req.method} ${req.path}`
      );
    },
    onError: (err, req, res) => {
      console.error("Proxy error to Error Service:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ message: "Error connecting to the Error Service." });
      }
    },
  });
};

module.exports = errorServiceProxy;
