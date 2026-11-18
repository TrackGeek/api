import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { UpdateProfileDto } from "@/modules/profile/dto/update-profile.dto";
import { ProfileService } from "@/modules/profile/service/profile.service";
import { MediaTitleInterceptor } from "@/shared/media-title/media-title.interceptor";

const data = { anime: { malId: 1, title: "Original", imageUrl: null } };

function fixture(preference?: string) {
  const titles = { localize: vi.fn().mockResolvedValue({ anime: { title: "Localized" } }) };
  const auth = {
    api: {
      getSession: vi
        .fn()
        .mockResolvedValue(preference ? { user: { profile: { animeMangaTitleLanguage: preference } } } : null),
    },
  };
  const response = { setHeader: vi.fn() };
  const context = {
    getType: () => "http",
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }), getResponse: () => response }),
  };
  const interceptor = new MediaTitleInterceptor(titles as any, auth as any);
  return { titles, auth, response, context, interceptor };
}

describe("Media title preference", () => {
  it.each(["romaji", "native", "english"])("validates and persists %s to account", async (language) => {
    const dto = plainToInstance(UpdateProfileDto, { userId: "reader", animeMangaTitleLanguage: language });
    expect(await validate(dto)).toEqual([]);
    const database = { profile: { update: vi.fn().mockResolvedValue({}) } };
    const service = new ProfileService(database as any, {} as any, {} as any, {} as any);
    await service.updateProfile(dto);
    expect(database.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "reader" },
        data: expect.objectContaining({ animeMangaTitleLanguage: language }),
      }),
    );
  });

  it("rejects unsupported title languages", async () => {
    const errors = await validate(plainToInstance(UpdateProfileDto, { animeMangaTitleLanguage: "invalid" }));
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ property: "animeMangaTitleLanguage" })]));
  });

  it.each(["romaji", "native", "english", undefined])(
    "uses viewer preference %s and prevents shared caching",
    async (preference) => {
      const { interceptor, context, titles, response } = fixture(preference);
      await lastValueFrom(interceptor.intercept(context as any, { handle: () => of(data) }));
      expect(titles.localize).toHaveBeenCalledWith(data, preference ?? "romaji");
      expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    },
  );

  it("skips authentication and localization for unrelated responses", async () => {
    const { interceptor, context, auth, titles } = fixture();
    const result = await lastValueFrom(interceptor.intercept(context as any, { handle: () => of({ count: 3 }) }));
    expect(result).toEqual({ count: 3 });
    expect(auth.api.getSession).not.toHaveBeenCalled();
    expect(titles.localize).not.toHaveBeenCalled();
  });
});
