const express = require("express");
const {
  createPost,
  GetAllPost,
  getPost,
  deletePost,
} = require("../controllers/postController");
const authenticateRequest = require("../middleware/authMiddelware");

const router = express.Router();

//middleware -> to check if user is authenticated or not
router.use(authenticateRequest);

router.post("/create-post", createPost);

router.get("/get-all-posts", GetAllPost);

router.get("/:id", getPost);

router.delete("/:id", deletePost);
module.exports = router;
