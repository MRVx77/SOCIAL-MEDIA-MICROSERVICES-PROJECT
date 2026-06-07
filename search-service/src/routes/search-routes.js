const express = require("express");
const authenticateRequest = require("../middleware/authMiddelware");
const searchPostController = require("../controllers/search-controller");

const router = express.Router();

router.use(authenticateRequest);

router.get("/posts", searchPostController);

module.exports = router;
