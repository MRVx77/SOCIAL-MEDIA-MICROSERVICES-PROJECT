const Search = require("../models/Search");
const logger = require("../utils/logger");

async function invaildatePostCache(req, input) {
  const cacheKey = `post:${input}`;
  await req.redisClient.del(cacheKey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newSearchPost.save();

    invaildatePostCache(req, newSearchPost._id.toString());

    logger.info(
      `Search post created : ${event.postId}, ${newSearchPost._id.toString()}`,
    );
  } catch (error) {
    logger.error(error, "Error handling post creationn evnet");
  }
}

async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    logger.info(`Search post deleted: ${event.postId}`);
  } catch (error) {
    logger.error(error, "Error handling post creationn evnet");
  }
}

module.exports = { handlePostCreated, handlePostDeleted };
