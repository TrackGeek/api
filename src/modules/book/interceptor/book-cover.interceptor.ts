import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { mergeMap } from "rxjs";
import { BookCoverService } from "../service/book-cover.service";
import { applyBookCovers, collectBookIds } from "../utils/book-cover-response";

@Injectable()
export class BookCoverInterceptor implements NestInterceptor {
  constructor(
    private readonly bookCoverService: BookCoverService,
    private readonly authService: AuthService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const locale = request.get("X-TrackGeek-Language");
    if (!locale) return next.handle();
    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        const ids = collectBookIds(data);
        if (!ids.length) return data;
        const response = context.switchToHttp().getResponse<Response>();
        response.setHeader("Cache-Control", "private, no-store");
        const session = await this.authService.api.getSession({ headers: fromNodeHeaders(request.headers) });
        const covers = await this.bookCoverService.resolveCovers(ids, locale, session?.user.id);
        return applyBookCovers(data, covers);
      }),
    );
  }
}
