const { createProxyMiddleware } = require("http-proxy-middleware");

const tasksServiceProxy = (tasksServiceUrl) => {
  if (!tasksServiceUrl) {
    throw new Error(
      "TASKS_API_INTERNAL_URL is not defined in .env for API Gateway"
    );
  }

  return createProxyMiddleware({
    target: tasksServiceUrl,
    changeOrigin: true,
    pathRewrite: {
      "^/gw/tasks": "/tasks",
      "^/gw/categories": "/categories",
      "^/gw/import": "/import",
      "^/gw/export": "/export",
      "^/gw/reports": "/reports",
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
        `[HPM tasks] Proxying request from ${req.originalUrl} to ${tasksServiceUrl}${proxyReq.path}`
      );
    },
    onError: (err, req, res, target) => {
      console.error(
        `[HPM tasks] Proxying to ${target ? target.href : "tasks-api"} failed:`,
        err
      );
      if (res.headersSent) {
        return;
      }
      if (res && typeof res.status === "function") {
        res.status(503).json({
          message: "Error connecting to the Tasks Service.",
          proxyError: err.message,
        });
      } else {
        console.error(
          "[HPM tasks onError] Cannot send error response, res is not valid."
        );
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `[HPM tasks onProxyRes] For ${req.method} ${req.originalUrl}, received response from tasks-api: ${proxyRes.statusCode}`
      );
    },
  });
};

module.exports = tasksServiceProxy;
