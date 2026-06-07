const Media = require("../models/Media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDelete = async (event) => {
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);

      logger.info(
        `Deleted media ${media._id} assciated with this deleted post ${postId}`,
      );
    }
    logger.info(`Processed deletion of media for post id ${postId}`);
  } catch (error) {
    logger.error("Error occuer while deletion ", error);
  }
};

module.exports = handlePostDelete;
