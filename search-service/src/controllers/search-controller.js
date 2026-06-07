const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("search endpoint hit..");
  try {
    const { query } = req.query;
    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    //pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const startIndex = (page - 1) * limit;

    //implement cacheing for 2 to 3 min
    //caching with pagination
    const cacheKey = `search:${query}:${page}:${limit}`;
    const cachePosts = await req.redisClient.get(cacheKey);

    if (cachePosts) {
      return res.json(JSON.parse(cachePosts));
    }

    const totalDocuments = await Search.countDocuments({
      $text: { $search: query },
    });

    const result = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      },
    )
      .sort({ score: { $meta: "textScore" } })
      .skip(startIndex)
      .limit(limit);

    const response = {
      data: result,
      totalDocuments,
      totalPages: Math.ceil(totalDocuments / limit),
      currentPage: page,
    };

    await req.redisClient.setex(cacheKey, 180, JSON.stringify(response));
    res.json(response);
  } catch (error) {
    logger.error("Error while searching post", error);
    res.status(500).json({
      success: false,
      message: "Error seaching post",
    });
  }
};

module.exports = searchPostController;
