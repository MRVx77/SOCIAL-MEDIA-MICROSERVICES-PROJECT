const jwt = require("jsonwebtoken");

const logger = require("../utils/logger");

const validatetoken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Access attempt without vaild token");
    return res.status(400).json({
      success: false,
      message: "Authentication required",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid token");
      return res.status(429).json({
        success: false,
        message: "Invalid token",
      });
    }
    req.user = user;
    next();
  });
};

module.exports = { validatetoken };
