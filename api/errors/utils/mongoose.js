// utils/mongoose.js
const mongoose = require("mongoose");

async function connectDB() {
  try {
    const mongoHost = process.env.MONGO_HOST || "localhost";
    const mongoPort = process.env.MONGO_PORT || "27017";
    const mongoUser = process.env.MONGO_USER || "todoapp";
    const mongoDb = process.env.MONGO_DB || "tododb";
    const mongoPassword = process.env.MONGO_PASSWORD || "mongo123";

    const mongoUri = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDb}?authSource=admin`;

    console.log(`Connecting to MongoDB at ${mongoHost}:${mongoPort}...`);

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB successfully");

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

async function closeDB() {
  try {
    await mongoose.disconnect();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    throw error;
  }
}

module.exports = { connectDB, closeDB };
