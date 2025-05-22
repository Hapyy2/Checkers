require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/db");
const errorRoutes = require("./routes/errorRoutes");

const app = express();

connectDB();

app.use(express.json());

app.use("/api/errors", errorRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled error in errors-api:", err.stack);
  if (!res.headersSent) {
    res.status(500).send({
      message: "An unexpected internal error occurred within the errors-api.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(
    `Errors API running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
