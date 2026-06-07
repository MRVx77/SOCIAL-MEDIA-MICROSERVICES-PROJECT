require("dotenv").config();

const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  await mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => logger.info("Connected to MongoDB"))
    .catch((e) => logger.error("Mogo connection error", e));
};

module.exports = connectDB;
