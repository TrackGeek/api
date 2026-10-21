import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { mergeMap } from "rxjs";
import { TMDBService } from "@/shared/infra/integrations/tmdb.service";
import { applyTmdbLocalizations, collectTmdbMedia } from "./tmdb-localization-response";

@Injectable()
export class TMDBLocalizationInterceptor implements NestInterceptor {
  constructor(private readonly tmdbService: TMDBService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const locale = request.get("X-TrackGeek-Language");
    if (!locale) return next.handle();
    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        const media = collectTmdbMedia(data);
        if (!media.length) return data;
        const response = context.switchToHttp().getResponse<Response>();
        response.vary("X-TrackGeek-Language");
        response.setHeader("Cache-Control", "private, no-store");
        const localized = await this.tmdbService.getLocalizedMedia(media, locale);
        return applyTmdbLocalizations(data, localized);
      }),
    );
  }
}
