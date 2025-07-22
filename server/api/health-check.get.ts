import logger from "~~/server/utils/log";

export default defineEventHandler(async (_event) => {
  logger.info("Health check endpoint hit");
  return {
    message: "Server is running okay!",
    timestamp: new Date().toISOString(),
    status: "healthy",
  };
});
