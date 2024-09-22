const { CustomApiError } = require("./CustomApiError.js") ;
const { InternalServerError } = require("./index.js") ;

const GlobalErrorHandler = (err, req, res, next) => {
	try {
		if (err instanceof CustomApiError) {
			return res.status(err.statusCode).json(err);
		}
		console.log(err);
		res.status(500).json(InternalServerError());
	} catch (error) {
		res.status(500).json(InternalServerError());
	}
};

module.exports = { GlobalErrorHandler };