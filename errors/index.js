const CustomApiError = require("./CustomApiError.js");

const NotFoundError = (msg) =>  CustomApiError(msg || "Not Found", 404);
const BadRequestError = (msg) =>  CustomApiError(msg || "Bad Request", 400);
const UnauthorizedError = (msg) =>  CustomApiError(msg || "Unauthorized", 401);
const ForbiddenError = (msg) =>  CustomApiError(msg || "Forbidden", 403);
const InternalServerError = (msg) =>  CustomApiError(msg || "Internal Server Error", 500);

module.exports = {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
};
