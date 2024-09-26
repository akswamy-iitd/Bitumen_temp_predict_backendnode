export class ApiResponse {
	constructor(statusCode, data, message = undefined) {
		this.statusCode = statusCode;
		this.message = message;
		this.data = data;
	}
}