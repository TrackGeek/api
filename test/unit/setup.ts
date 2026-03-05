import { Logger } from "@nestjs/common";
import { vi } from "vitest";

vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
vi.spyOn(Logger.prototype, "debug").mockImplementation(() => undefined);
vi.spyOn(Logger.prototype, "verbose").mockImplementation(() => undefined);
