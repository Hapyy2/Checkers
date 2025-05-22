const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema({
  timestamp: {
    // Timestamp of when the original error occurred
    type: Date,
    required: true,
  },
  sourceService: {
    // e.g., 'api-gateway', 'tasks-api', 'projects-api'
    type: String,
    required: true,
    trim: true,
    index: true, // Indexed for filtering
  },
  errorMessage: {
    type: String,
    required: true,
    trim: true,
  },
  errorCode: {
    // Optional application-specific error code
    type: String,
    trim: true,
    index: true, // Indexed for filtering
  },
  requestDetails: {
    // Details about the original request that failed
    method: String,
    url: String,
    userId: String, // Could be indexed if you often search by userId
    ipAddress: String,
  },
  stackTrace: {
    // Full stack trace, if available
    type: String,
  },
  additionalContext: {
    // For any other structured data
    type: mongoose.Schema.Types.Mixed,
  },
  loggedAt: {
    // Timestamp of when this log entry was created in the errors-api
    type: Date,
    default: Date.now,
    index: true, // Indexed for sorting by log entry time (alternative to 'timestamp')
  },
});

// Ensure timestamp is indexed for sorting by error occurrence time
errorLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("ErrorLog", errorLogSchema);
