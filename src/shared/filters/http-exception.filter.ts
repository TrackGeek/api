import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ERROR_CODES } from "../constants/error-codes";
import { Prisma } from '@prisma/generated/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(HttpExceptionFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
    
    if (exception instanceof Prisma.PrismaClientValidationError) {
      const databaseValidationError = ERROR_CODES.DATABASE_VALIDATION_ERROR;
      
      return response.status(databaseValidationError.status).json(databaseValidationError);
    }
    
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002' || exception.code === 'P2003') {
        const databaseConflictError = ERROR_CODES.DATABASE_CONFLICT;
        
        return response.status(databaseConflictError.status).json(databaseConflictError);
      }
      
      if (exception.code === 'P2025') {
        const databaseItemNotFoundError = ERROR_CODES.DATABASE_ITEM_NOT_FOUND;
        
        return response.status(databaseItemNotFoundError.status).json(databaseItemNotFoundError);
      }
    }

		if (exception instanceof HttpException) {
			const status = exception.getStatus();
			const message = exception.getResponse();

			if (status === 404) {
				return response
					.status(status)
					.json(ERROR_CODES.NOT_FOUND);
			}
      
      const isAppException = typeof message === "object" && message !== null && "code" in message;
      
      if (isAppException) {
        return response.status(status).json(message?.["code"]);
      }  

			return response.status(status).json({ code: message, status });
		}

		this.logger.error(
			"Unhandled exception occurred:",
			exception instanceof Error ? exception.stack : exception,
		);

		const internalError = ERROR_CODES.INTERNAL_SERVER_ERROR;

		return response.status(internalError.status).json(internalError);
	}
}
