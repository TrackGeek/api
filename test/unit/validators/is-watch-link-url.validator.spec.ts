import { describe, expect, it } from "vitest";
import { isWatchLinkUrl } from "@/shared/validators/is-watch-link-url.validator";

describe("isWatchLinkUrl", () => {
  it("accepts https templates with known variables", () => {
    expect(isWatchLinkUrl("https://www.imdb.com/title/%ID_IMDB%")).toBe(true);
    expect(isWatchLinkUrl("https://example.com/search?q=%TITLE+%&s=%SEASON%&e=%EPISODE%")).toBe(true);
  });

  it("accepts custom protocol templates", () => {
    expect(isWatchLinkUrl("stremio://detail/movie/%ID_IMDB%")).toBe(true);
    expect(isWatchLinkUrl("intent://watch/%ID_MAL%")).toBe(true);
  });

  it("rejects blocked schemes", () => {
    expect(isWatchLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isWatchLinkUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isWatchLinkUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects relative or schemeless urls", () => {
    expect(isWatchLinkUrl("/search?q=%TITLE%")).toBe(false);
    expect(isWatchLinkUrl("example.com/%ID_TMDB%")).toBe(false);
  });

  it("rejects unknown variables", () => {
    expect(isWatchLinkUrl("https://example.com/%ID_ANILIST%")).toBe(false);
  });

  it("rejects urls with whitespace or markup characters", () => {
    expect(isWatchLinkUrl("https://example.com/a b")).toBe(false);
    expect(isWatchLinkUrl('https://example.com/"onload=')).toBe(false);
  });

  it("rejects urls over the length limit", () => {
    expect(isWatchLinkUrl(`https://example.com/${"a".repeat(500)}`)).toBe(false);
  });
});
