import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
} from "@nestjs/common";
import { Response } from "express";
import { AppException } from "../exceptions/app.exceptions";
import { ERROR_CODES } from "../constants/error-codes";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		const status = exception instanceof HttpException
      ? exception.getStatus()
      : ERROR_CODES.INTERNAL_SERVER_ERROR.status;

		const code = exception instanceof AppException
      ? exception.getResponse()
      : ERROR_CODES.INTERNAL_SERVER_ERROR;

		response.status(status).json({ code });
	}
}
