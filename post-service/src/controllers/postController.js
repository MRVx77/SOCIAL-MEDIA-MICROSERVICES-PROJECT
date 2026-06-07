const Post = require("../models/Post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

async function invaildatePostCache(req, input) {
  const cachekey = `post:${input}`;
  await req.redisClient.del(cachekey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  try {
    //validate for errors
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Vaildation Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;

    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    await invaildatePostCache(req, newlyCreatedPost._id.toString());
    logger.info("Post created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully.",
    });
  } catch (error) {
    logger.error("Error while creaitng post", error);
    res.status(500).json({
      success: false,
      message: "Error creaing post",
    });
  }
};

const GetAllPost = async (req, res) => {
  try {
    //pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    //cacheing with pagegination
    const cacheKey = `posts:${page}:${limit}`;
    const cachePosts = await req.redisClient.get(cacheKey);

    if (cachePosts) {
      return res.json(JSON.parse(cachePosts));
    }
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPost: totalNoOfPosts,
    };

    //save  your post in redis catch
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    res.json(result);
  } catch (error) {
    logger.error("Error while fetching posts", error);
    res.status(500).json({
      success: false,
      message: "Error featching posts",
    });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    //caching
    const cachekey = `posts:${postId}`;
    const cachedPost = await req.redisClient.get(cachekey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    const singlePost = await Post.findById(postId);

    if (!singlePost) {
      return res.status(404).json({
        success: false,
        message: "Post Not Found",
      });
    }

    await req.redisClient.setex(cachekey, 3600, JSON.stringify(singlePost));

    res.json(singlePost);
  } catch (error) {
    logger.error("Error while fetching post", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findOneAndDelete({
      _id: postId,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post Not Found",
      });
    }

    //publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invaildatePostCache(req, postId);

    res.json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error while deleting post", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, GetAllPost, getPost, deletePost };
