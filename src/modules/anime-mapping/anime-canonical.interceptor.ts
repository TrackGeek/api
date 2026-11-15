import { type CallHandler, type ExecutionContext, HttpException, Injectable, type NestInterceptor } from "@nestjs/common";
import { DatabaseService } from "@/shared/infra/database/database.service";
import { AnimeMappingService } from "./service/anime-mapping.service";

@Injectable()
export class AnimeCanonicalInterceptor implements NestInterceptor {
  constructor(private readonly database: DatabaseService, private readonly mappings: AnimeMappingService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== "http") return next.handle();
    const request = context.switchToHttp().getRequest();
    if (!["POST", "PUT", "PATCH"].includes(request.method)) return next.handle();
    for (const [field, model, type] of [["movieId", "movie", "movie"], ["tvShowId", "tvShow", "tv"]] as const) {
      const id = request.body?.[field] ?? request.params?.[field];
      if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) continue;
      const source = await (this.database[model] as any).findUnique({ where: { id }, select: { tmdbId: true } });
      if (!source) continue;
      const anime = await this.mappings.resolve(type, source.tmdbId);
      if (anime) throw new HttpException({ code: { code: "MEDIA_MOVED_TO_ANIME", status: 409, anime } }, 409);
    }
    return next.handle();
  }
}
