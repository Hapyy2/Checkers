require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const prisma = require("./config/db");
const reportError = require("./config/reportError");
const mainApiRoutes = require("./routes/index");

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan(process.env.LOG_LEVEL || "short"));
}

app.use("/", mainApiRoutes);

app.use(async (err, req, res, next) => {
  console.error(
    `Unhandled error in ${process.env.SERVICE_NAME || "tasks-api"}:`,
    err
  );

  const requestContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
  };

  reportError(err, requestContext, { serviceInternal: true });

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "PrismaClientKnownRequestError") {
    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ message: err.meta?.cause || "Resource not found." });
    }
    return res
      .status(400)
      .json({ message: "Database request error.", code: err.code });
  }

  res.status(500).json({
    message: "An unexpected internal server error occurred.",
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
});

const PORT = process.env.PORT || 3100;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("Successfully connected to the database.");

    app.listen(PORT, () => {
      console.log(
        `${process.env.SERVICE_NAME || "Tasks API"} running in ${
          process.env.NODE_ENV
        } mode on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server or connect to database:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
