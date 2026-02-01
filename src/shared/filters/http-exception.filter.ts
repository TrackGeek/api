import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ERROR_CODES } from "../constants/error-codes";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const message = exception.getResponse();

			if (status === 404) {
				return response
					.status(status)
					.json({ code: ERROR_CODES.NOT_FOUND.message, status });
			}

			return response
				.status(status)
				.json({ code: message?.["message"] ?? message, status });
		}

		this.logger.error(
			"Unhandled exception occurred:",
			exception instanceof Error ? exception.stack : exception,
		);

		const status = ERROR_CODES.INTERNAL_SERVER_ERROR.status;
		const code = ERROR_CODES.INTERNAL_SERVER_ERROR.message;

		return response.status(status).json({ code, status });
	}
}
