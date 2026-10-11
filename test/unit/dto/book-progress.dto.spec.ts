import { ProgressStatus } from "@prisma/generated/enums";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateOrUpdateBookProgressDto } from "@/modules/book/dto/create-or-update-book-progress.dto";

const input = { bookId: "book-1", status: ProgressStatus.Reading };

describe("CreateOrUpdateBookProgressDto", () => {
  it("accepts an edition total before any pages or rereads are recorded", async () => {
    const dto = plainToInstance(CreateOrUpdateBookProgressDto, {
      ...input,
      totalPages: 500,
      chaptersRead: 0,
      readCount: 0,
    });

    expect(await validate(dto)).toEqual([]);
  });

  it("accepts omitted totals for existing clients and books without page counts", async () => {
    expect(await validate(plainToInstance(CreateOrUpdateBookProgressDto, input))).toEqual([]);
  });

  it.each([0, -1, 1.5, 2147483648, "500"])("rejects an invalid edition total (%s)", async (totalPages) => {
    const dto = plainToInstance(CreateOrUpdateBookProgressDto, { ...input, totalPages });

    expect(await validate(dto)).toEqual(expect.arrayContaining([expect.objectContaining({ property: "totalPages" })]));
  });
});
