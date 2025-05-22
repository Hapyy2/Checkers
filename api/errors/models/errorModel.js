// models/errorModel.js
const ErrorSchema = require("./errorSchema");

class ErrorModel {
  async create(errorData) {
    const error = new ErrorSchema({
      ...errorData,
      timestamp: new Date(),
    });

    await error.save();
    return error;
  }

  async findAll(filters = {}) {
    const {
      service,
      level,
      startDate,
      endDate,
      userId,
      limit = 100,
      skip = 0,
    } = filters;

    const query = {};

    if (service) query.service = service;
    if (level) query.level = level;
    if (userId) query["user.id"] = userId;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      ErrorSchema.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      ErrorSchema.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async findById(id) {
    return await ErrorSchema.findById(id);
  }

  async getStats(timeframe = "24h") {
    const timeframes = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(
      Date.now() - (timeframes[timeframe] || timeframes["24h"])
    );

    const stats = await ErrorSchema.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            service: "$service",
            level: "$level",
            errorName: "$error.name",
          },
          count: { $sum: 1 },
          lastOccurrence: { $max: "$timestamp" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    return stats;
  }

  async cleanup(olderThan = "30d") {
    const timeframes = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };

    const cutoffDate = new Date(
      Date.now() - (timeframes[olderThan] || timeframes["30d"])
    );

    return await ErrorSchema.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
  }
}

module.exports = new ErrorModel();
