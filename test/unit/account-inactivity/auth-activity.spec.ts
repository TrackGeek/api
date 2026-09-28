import { describe, expect, it, vi } from "vitest";
import { getAuthConfig } from "@/modules/auth/config/auth.config";

const { customizeSession } = vi.hoisted(() => ({ customizeSession: vi.fn() }));
vi.mock("better-auth/plugins", async (importOriginal) => ({
  ...(await importOriginal<typeof import("better-auth/plugins")>()),
  customSession: (callback: unknown) => {
    customizeSession(callback);
    return { id: "custom-session" };
  },
}));

function setup() {
  const userService = {
    recordActivity: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue({ id: "user-1" }),
  };
  const config = getAuthConfig({
    configService: { get: () => undefined } as any,
    databaseService: {} as any,
    userService: userService as any,
  });
  return { config, userService };
}

describe("Better Auth activity hooks", () => {
  it("records usage of an existing long-lived session", async () => {
    const { userService } = setup();
    const callback = customizeSession.mock.calls.at(-1)![0];
    const session = { userId: "user-1", createdAt: new Date("2025-01-01") };
    await expect(callback({ session })).resolves.toEqual({ session, user: { id: "user-1" } });
    expect(userService.recordActivity).toHaveBeenCalledWith("user-1");
  });

  it("records a new sign-in even before the client requests its session", async () => {
    const { config, userService } = setup();
    await config.databaseHooks!.session!.create!.after!({ userId: "user-1" } as any, null);
    expect(userService.recordActivity).toHaveBeenCalledWith("user-1");
  });
});
