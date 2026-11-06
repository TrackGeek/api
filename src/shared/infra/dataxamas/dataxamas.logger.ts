import { inspect } from "node:util";
import { ConsoleLogger, Injectable, type LogLevel } from "@nestjs/common";
import { type DataxamasLogLevel, DataxamasService } from "./dataxamas.service";

const BOOTSTRAP_CONTEXTS = new Set([
  "InstanceLoader",
  "RoutesResolver",
  "RouterExplorer",
  "NestFactory",
  "NestApplication",
]);

const FORWARDED_LEVELS = { log: "info", warn: "warn", debug: "debug", verbose: "debug" } as const satisfies Partial<
  Record<LogLevel, DataxamasLogLevel>
>;

const INSPECT_OPTIONS = { depth: 4, breakLength: Number.POSITIVE_INFINITY };

const ERROR_NAME_PATTERN = /^(\w*(?:Error|Exception))\b/;

const MAX_MESSAGE_LENGTH = 10_000;

const MAX_STACK_LENGTH = 50_000;

function toText(value: unknown): string {
  return typeof value === "string" ? value : inspect(value, INSPECT_OPTIONS);
}

function toSerializable(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };

  try {
    JSON.stringify(value);

    return value;
  } catch {
    return inspect(value, INSPECT_OPTIONS);
  }
}

@Injectable()
export class DataxamasLogger extends ConsoleLogger {
  constructor(private readonly dataxamas: DataxamasService) {
    super();
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    this.forward("log", [message, ...optionalParams], () => super.log(message, ...optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    this.forward("warn", [message, ...optionalParams], () => super.warn(message, ...optionalParams));
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    this.forward("debug", [message, ...optionalParams], () => super.debug(message, ...optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    this.forward("verbose", [message, ...optionalParams], () => super.verbose(message, ...optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    super.error(message, ...optionalParams);

    this.capture("error", [message, ...optionalParams]);
  }

  fatal(message: unknown, ...optionalParams: unknown[]) {
    super.fatal(message, ...optionalParams);

    this.capture("fatal", [message, ...optionalParams]);
  }

  private forward(level: keyof typeof FORWARDED_LEVELS, args: unknown[], print: () => void) {
    if (!this.isLevelEnabled(level)) return;

    const { messages, context } = this.getContextAndMessagesToPrint(args);

    if (!this.dataxamas.enabled || (context && BOOTSTRAP_CONTEXTS.has(context))) {
      print();

      return;
    }

    const [first, ...others] = messages;
    const text = toText(first);
    const rest = others.filter((value) => value !== undefined);

    this.dataxamas.log(
      FORWARDED_LEVELS[level],
      (context ? `[${context}] ${text}` : text).slice(0, MAX_MESSAGE_LENGTH),
      rest.length > 0 ? rest.map(toSerializable) : undefined,
    );
  }

  private capture(level: "error" | "fatal", args: unknown[]) {
    if (!this.dataxamas.enabled || !this.isLevelEnabled(level)) return;

    const { messages, context, stack } = this.getContextAndStackAndMessagesToPrint(args);
    const [first, ...rest] = messages;
    const cause = messages.find((value): value is Error => value instanceof Error);

    const error = new Error((first instanceof Error ? first.message : toText(first)).slice(0, MAX_MESSAGE_LENGTH));

    error.name = cause?.name ?? (stack ? ERROR_NAME_PATTERN.exec(stack)?.[1] : undefined) ?? "Error";
    error.stack = (cause?.stack ?? stack)?.slice(0, MAX_STACK_LENGTH);

    const data = rest.filter((value) => value !== cause).map(toSerializable);

    this.dataxamas.captureException(error, { context, level, ...(data.length > 0 && { data }) });
  }
}
