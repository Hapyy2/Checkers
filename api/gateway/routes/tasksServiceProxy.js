const { createProxyMiddleware } = require("http-proxy-middleware");

const tasksServiceProxy = (tasksServiceUrl) => {
  if (!tasksServiceUrl) {
    throw new Error("TASKS_API_INTERNAL_URL is not defined in .env");
  }

  return createProxyMiddleware({
    target: tasksServiceUrl,
    changeOrigin: true,
    pathRewrite: {
      "^/gw/tasks": "/api/v1",
    },
    timeout: 60000,
    proxyTimeout: 300000,
    logLevel: "debug",
    logProvider: () => console,
    onProxyReq: (proxyReq, req, res) => {
      console.log("[API Gateway onProxyReq] Original req.method:", req.method); // Dodaj to
      console.log(
        '[API Gateway onProxyReq] Original req.headers["content-type"]:',
        req.headers["content-type"]
      );
      console.log(
        "[API Gateway onProxyReq] Parsed req.body in Gateway:",
        req.body
      );

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
        `Proxying request to Tasks Service: ${req.method} ${proxyReq.path}`
      );
    },
    onError: (err, req, res) => {
      console.error("Proxy error to Tasks Service:", err);
      if (!res.headersSent) {
        res
          .status(503)
          .json({ message: "Error connecting to the Tasks Service." });
      }
    },
  });
};

module.exports = tasksServiceProxy;
