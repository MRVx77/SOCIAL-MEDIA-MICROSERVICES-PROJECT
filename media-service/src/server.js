require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const mediaRoutes = require("./routes/media-routes");
const logger = require("./utils/logger");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const handlePostDelete = require("./eventHandlers/media-event-handler");

const app = express();
const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((e) => {
    logger.error("MONGO connection error", e);
  });

//middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

const redisClient = new Redis(process.env.REDIS_URL);

//Ip based rate limiting for sensitive endpoints
const sensitiveEndpointLimter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply this sensitiveEndpointsLimiter to our routes
app.use("/api/meida/upload", sensitiveEndpointLimter);

//Routes -> pass redisclient to routes
app.use("/api/media", mediaRoutes);

async function startServer() {
  try {
    await connectToRabbitMQ();

    //consume all the event

    await consumeEvent("post.deleted", handlePostDelete);

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.info(`Failed to connect to the server`, error);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason: ", reason);
});
