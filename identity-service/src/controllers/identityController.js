const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");

//user registration
const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    //validate
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Vaildation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, username } = req.body;

    //check if user exists or not
    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    //saving user to db
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    const { accessToken, refreshToken } = await generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered Successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//user login
const loginUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    //validating value from user like email value, pass lenght, etc.

    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Login Error", error.details[0].message);
      return res.status(400).josn({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;

    //chekcing if user exists or not
    let user = await User.findOne({ email });

    if (!user) {
      logger.warn("Invalid user");
      return res.status(400).josn({
        success: false,
        message: "User does not eixsts.",
      });
    }

    //valid password or not
    const isVaildPassword = await user.comparePassword(password);
    if (!isVaildPassword) {
      logger.warn("Invalid password");
      return res.status(400).josn({
        success: false,
        message: "Enter the correct password.",
      });
    }

    const { accessToken, refreshToken } = await generateToken(user);

    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//refresh token
const refreshTokenController = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).josn({
        success: false,
        message: "Refresh token missing",
      });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken || storedToken.expiredAt < new Date()) {
      logger.warn("Invalid or expired refresh token");

      return res.status(400).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("user not found");

      return res.status(400).json({
        success: false,
        message: "user not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    //delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Logiin error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//logout
const logoutUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");

      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    logger.warn("Refresh token deleted for logout");

    return res.json({
      success: true,
      messsag: "logout successfulyy",
    });
  } catch (error) {
    logger.error("Logiin error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshTokenController,
  logoutUser,
};
//4.47
