import { HttpException } from "@nestjs/common";

import { ERROR_CODES } from "@/shared/constants/error-codes";

export class AppException extends HttpException {
	constructor(code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES]) {
		super({ code: code.message }, code.status);
	}
}
