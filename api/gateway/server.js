require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const apiLimiter = require("./config/rateLimit");
const allProxyRoutes = require("./routes/index");

const app = express();

app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("short"));
}

app.use(apiLimiter);

app.use("/", allProxyRoutes);

app.use((req, res, next) => {
  res.status(404).json({
    message:
      "Not Found - The requested resource does not exist on the API Gateway.",
  });
});

app.use((err, req, res, next) => {
  console.error("API Gateway Error:", err.stack);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred on the API Gateway.",
    ...(process.env.NODE_ENV === "development" && { error: err.stack }),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(
    `API Gateway running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
