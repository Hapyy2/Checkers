const { createProxyMiddleware } = require("http-proxy-middleware");

const projectsServiceProxy = (projectsServiceUrl) => {
  if (!projectsServiceUrl) {
    throw new Error(
      "PROJECTS_API_INTERNAL_URL is not defined in .env for API Gateway"
    );
  }

  return createProxyMiddleware({
    target: projectsServiceUrl,
    changeOrigin: true,
    pathRewrite: {
      "^/gw/projects": "/api/v1/projects",
    },
    timeout: 60000,
    proxyTimeout: 300000,
    logLevel: "debug",
    logProvider: () => console,
    onProxyReq: (proxyReq, req, res) => {
      if (req.auth && req.auth.sub) {
        proxyReq.setHeader("X-User-ID", req.auth.sub);
        if (req.auth.realm_access && req.auth.realm_access.roles) {
          proxyReq.setHeader(
            "X-User-Roles",
            req.auth.realm_access.roles.join(",")
          );
        }
      }
      console.log(
        `[HPM projects] Proxying request from ${req.originalUrl} to ${projectsServiceUrl}${proxyReq.path}`
      );
    },
    onError: (err, req, res, target) => {
      console.error(
        `[HPM projects] Proxying to ${
          target ? target.href : "projects-api"
        } failed:`,
        err
      );
      if (res.headersSent) {
        return;
      }
      if (res && typeof res.status === "function") {
        res.status(503).json({
          message: "Error connecting to the Projects Service.",
          proxyError: err.message,
        });
      } else {
        console.error(
          "[HPM projects onError] Cannot send error response, res is not valid."
        );
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `[HPM projects onProxyRes] For ${req.method} ${req.originalUrl}, received response from projects-api: ${proxyRes.statusCode}`
      );
    },
  });
};

module.exports = projectsServiceProxy;
