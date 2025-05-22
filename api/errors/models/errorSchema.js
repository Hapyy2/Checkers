// models/errorSchema.js
const mongoose = require("mongoose");

const ErrorSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      index: true,
    },
    environment: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: String,
      required: true,
      enum: ["debug", "info", "warning", "error", "critical"],
      index: true,
    },
    error: {
      message: { type: String, required: true },
      stack: String,
      code: String,
      name: { type: String, required: true },
      details: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    request: {
      method: String,
      url: String,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
      query: mongoose.Schema.Types.Mixed,
      params: mongoose.Schema.Types.Mixed,
      ip: String,
    },
    user: {
      id: String,
      email: String,
      roles: [String],
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indeksy dla często używanych pól
ErrorSchema.index({ "user.id": 1 });
ErrorSchema.index({ service: 1, level: 1 });
ErrorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 dni TTL

const Error = mongoose.model("Error", ErrorSchema);

module.exports = Error;
