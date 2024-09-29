const { NotFoundError } = require("./index.js"); // Ensure the path is correct

const NotFoundErrorHandler = (req, res, next) => {
  next(NotFoundError("Not Found"));
};

module.exports = {NotFoundErrorHandler};
