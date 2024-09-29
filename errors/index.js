const CustomApiError = require("./CustomApiError.js");

const NotFoundError = (msg) => new CustomApiError(msg || "Not Found", 404);
const BadRequestError = (msg) => new CustomApiError(msg || "Bad Request", 400);
const UnauthorizedError = (msg) => new CustomApiError(msg || "Unauthorized", 401);
const ForbiddenError = (msg) => new CustomApiError(msg || "Forbidden", 403);
const InternalServerError = (msg) => new CustomApiError(msg || "Internal Server Error", 500);

module.exports = {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
};
