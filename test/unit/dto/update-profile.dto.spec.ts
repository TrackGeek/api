import { ContentType } from "@prisma/generated/enums";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { UpdateProfileDto } from "@/modules/profile/dto/update-profile.dto";

describe("UpdateProfileDto default search type", () => {
  it.each(Object.values(ContentType))("accepts %s", async (defaultSearchType) => {
    expect(await validate(plainToInstance(UpdateProfileDto, { defaultSearchType }))).toEqual([]);
  });

  it("allows older clients to omit the preference", async () => {
    expect(await validate(plainToInstance(UpdateProfileDto, {}))).toEqual([]);
  });

  it.each(["movie", "user", "cast", "", 123])("rejects unsupported search type %s", async (defaultSearchType) => {
    const errors = await validate(plainToInstance(UpdateProfileDto, { defaultSearchType }));
    expect(errors).toEqual(expect.arrayContaining([expect.objectContaining({ property: "defaultSearchType" })]));
  });
});
