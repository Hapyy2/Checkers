const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URL;
    console.log(`Connecting to MongoDB...`);

    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB successfully");

    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

const closeDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    throw error;
  }
};

module.exports = { connectDB, closeDB };
