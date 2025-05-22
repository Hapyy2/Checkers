// middleware/errorHandler.js
const { AppError } = require("../utils/errors");
const errorReporter = require("../utils/errorReporter");

// Obsługa błędów Prisma
const handlePrismaError = (error) => {
  switch (error.code) {
    case "P2002":
      return new AppError("Duplicate field value", 409, {
        field: error.meta?.target,
      });
    case "P2025":
      return new AppError("Record not found", 404);
    case "P2003":
      return new AppError("Foreign key constraint failed", 400, {
        field: error.meta?.field_name,
      });
    default:
      return new AppError("Database error", 500);
  }
};

// Główny middleware obsługi błędów
const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Obsługa błędów Prisma
  if (err.code?.startsWith("P")) {
    error = handlePrismaError(err);
  }

  // Obsługa błędów walidacji MongoDB (jeśli byłaby używana)
  if (err.name === "ValidationError") {
    const message = "Invalid input data";
    error = new AppError(message, 400);
  }

  // Obsługa błędów JWT
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new AppError("Token expired", 401);
  }

  // Pobierz dane użytkownika z tokenu (jeśli istnieją)
  const user = req.kauth?.grant?.access_token?.content || null;

  // Określ poziom błędu
  const level =
    error.statusCode >= 500
      ? "error"
      : error.statusCode >= 400
      ? "warning"
      : "info";

  // Dodaj kontekst z błędu jeśli istnieje
  const context = {
    requestId: req.id,
    processingTime: Date.now() - req.startTime,
    ...(err.context || {}),
    validation: err.details || undefined,
  };

  // Raportuj błąd do centralnego systemu
  await errorReporter.logError({
    error: err,
    request: req,
    user,
    context,
    level,
  });

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || "Server Error",
      status: error.statusCode || 500,
      requestId: req.id, // Dodaj ID requestu do odpowiedzi
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        details: error.details,
        context: err.context,
      }),
    },
  });
};

// Middleware dla nieznalezionych tras
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  error.context = { path: req.originalUrl, method: req.method };
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};
