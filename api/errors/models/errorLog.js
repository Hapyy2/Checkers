const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
  },
  sourceService: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  errorMessage: {
    type: String,
    required: true,
    trim: true,
  },
  errorCode: {
    type: String,
    trim: true,
    index: true,
  },
  requestDetails: {
    method: String,
    url: String,
    userId: String,
    ipAddress: String,
  },
  stackTrace: {
    type: String,
  },
  additionalContext: {
    type: mongoose.Schema.Types.Mixed,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

errorLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("ErrorLog", errorLogSchema);
