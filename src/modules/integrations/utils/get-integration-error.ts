import { HttpException } from "@nestjs/common";

export function getIntegrationError(error: unknown): { error: string; issues?: unknown } {
  if (!(error instanceof HttpException)) return { error: "internal_error" };
  const response = error.getResponse();
  if (typeof response === "string") return { error: response };
  if ("error" in response && response.error === "invalid_input" && "issues" in response) {
    return { error: "invalid_input", issues: response.issues };
  }
  if ("code" in response) {
    if (typeof response.code === "string") return { error: response.code };
    if (
      response.code &&
      typeof response.code === "object" &&
      "code" in response.code &&
      typeof response.code.code === "string"
    ) {
      return { error: response.code.code };
    }
  }
  if ("message" in response && typeof response.message === "string") return { error: response.message };
  return { error: "invalid_request" };
}
