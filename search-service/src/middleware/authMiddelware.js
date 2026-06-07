const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn(`Access attempted without user Id`);
    return res.status(401).json({
      success: false,
      message: "Atuehnticaton is required! Please login",
    });
  }

  req.user = { userId };
  next();
};

module.exports = authenticateRequest;
