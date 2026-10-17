import { UnprocessableEntityException } from "@nestjs/common";
import type { z } from "zod";

export function parseIntegrationInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new UnprocessableEntityException({
      error: "invalid_input",
      issues: result.error.issues.map(({ path, message }) => ({ path, message })),
    });
  }
  return result.data;
}
