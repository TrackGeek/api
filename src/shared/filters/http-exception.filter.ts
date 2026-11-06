import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/generated/client";
import type { Request, Response } from "express";
import { ERROR_CODES } from "../constants/error-codes";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.getResponse();

      if (status === 404) {
        return response.status(status).json(ERROR_CODES.NOT_FOUND);
      }

      const isObjectResponse = typeof message === "object" && message !== null;

      // @nestjs/terminus throws a ServiceUnavailableException carrying the health check result,
      // which must reach the client untouched.
      const isHealthCheckResult = isObjectResponse && "info" in message && "details" in message;

      if (isHealthCheckResult) {
        return response.status(status).json(message);
      }

      const isAppException = isObjectResponse && "code" in message;

      if (isAppException) {
        return response.status(status).json(message?.code);
      }

      return response.status(status).json({ code: message, status });
    }

    const route = `${request.method} ${request.route?.path ?? request.originalUrl.split("?")[0]}`;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002" || exception.code === "P2003") {
        this.logger.warn(`Prisma ${exception.code} on ${route}`, exception.meta);

        const databaseConflictError = ERROR_CODES.DATABASE_CONFLICT;

        return response.status(databaseConflictError.status).json(databaseConflictError);
      }

      if (exception.code === "P2025") {
        this.logger.warn(`Prisma ${exception.code} on ${route}`, exception.meta);

        const databaseItemNotFoundError = ERROR_CODES.DATABASE_ITEM_NOT_FOUND;

        return response.status(databaseItemNotFoundError.status).json(databaseItemNotFoundError);
      }
    }

    this.logger.error(
      `Unhandled exception on ${route}: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : exception,
    );

    if (exception instanceof Prisma.PrismaClientValidationError) {
      const databaseValidationError = ERROR_CODES.DATABASE_VALIDATION_ERROR;

      return response.status(databaseValidationError.status).json(databaseValidationError);
    }

    const internalError = ERROR_CODES.INTERNAL_SERVER_ERROR;

    return response.status(internalError.status).json(internalError);
  }
}
