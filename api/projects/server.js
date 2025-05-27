require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const prisma = require("./config/db");
const reportError = require("./config/reportError");
const mainProjectRoutes = require("./routes/index");

const app = express();
const PORT = process.env.PORT || 3200;
const SERVICE_NAME = process.env.SERVICE_NAME || "projects-api";

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan(process.env.LOG_LEVEL || "short"));
}

app.use("/api/v1/projects", mainProjectRoutes);

app.get(`/${SERVICE_NAME}/health`, (req, res) => {
  res.status(200).json({
    status: "OK",
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

app.use(async (err, req, res, next) => {
  console.error(`Unhandled error in ${SERVICE_NAME}:`, err.message, err.stack);

  const requestContext = {
    method: req.method,
    url: req.originalUrl,
    ipAddress: req.ip,
    userId: req.headers["x-user-id"],
  };

  reportError(err, requestContext, {
    serviceSpecificInfo: "projects-api failure",
  });

  if (res.headersSent) {
    return next(err);
  }

  if (err.code && err.code.startsWith("P")) {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ message: err.meta?.cause || "Resource not found." });
    }
    return res.status(400).json({
      message: "Database request error.",
      code: err.code,
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  res.status(500).json({
    message: "An unexpected internal server error occurred in projects-api.",
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
});

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log(`Successfully connected to the database for ${SERVICE_NAME}.`);

    app.listen(PORT, () => {
      console.log(
        `${SERVICE_NAME} running in ${process.env.NODE_ENV} mode on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      `Failed to start ${SERVICE_NAME} or connect to database:`,
      error
    );
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
