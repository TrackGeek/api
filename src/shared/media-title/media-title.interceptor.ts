import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { mergeMap } from "rxjs";
import { MediaTitleService } from "./media-title.service";
import { mapMediaTitles, type TitleLanguage } from "./media-title-response";

@Injectable()
export class MediaTitleInterceptor implements NestInterceptor {
  constructor(
    private readonly titles: MediaTitleService,
    private readonly auth: AuthService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== "http") return next.handle();
    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        let hasMedia = false;
        mapMediaTitles(data, (record) => {
          hasMedia = true;
          return record;
        });
        if (!hasMedia) return data;
        const request = context.switchToHttp().getRequest<Request>();
        const session = await this.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        const user = session?.user as { profile?: { animeMangaTitleLanguage?: string } } | undefined;
        const preference = user?.profile?.animeMangaTitleLanguage;
        const language: TitleLanguage = preference === "english" || preference === "native" ? preference : "romaji";
        context.switchToHttp().getResponse<Response>().setHeader("Cache-Control", "private, no-store");
        return this.titles.localize(data, language);
      }),
    );
  }
}
