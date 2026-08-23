import { registerDecorator, ValidationOptions } from "class-validator";
import {
  BLOCKED_WATCH_LINK_SCHEMES,
  MAX_WATCH_LINK_URL_LENGTH,
  WATCH_LINK_VARIABLES,
} from "@/shared/constants/watch-link";

const SCHEME_REGEX = /^([a-z][a-z0-9+.-]*):\/?\/?(.+)$/i;

const VARIABLE_REGEX = /%([^%\s]+)%/g;

const knownVariables = new Set<string>(WATCH_LINK_VARIABLES);

export function isWatchLinkUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const url = value.trim();

  if (!url || url.length > MAX_WATCH_LINK_URL_LENGTH) return false;

  if (/[\s<>"']/.test(url)) return false;

  const match = SCHEME_REGEX.exec(url);

  if (!match) return false;

  if (BLOCKED_WATCH_LINK_SCHEMES.includes(match[1].toLowerCase())) return false;

  for (const [, variable] of url.matchAll(VARIABLE_REGEX)) {
    if (!knownVariables.has(variable.toUpperCase())) return false;
  }

  return true;
}

export function IsWatchLinkUrl(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "isWatchLinkUrl",
      target: object.constructor,
      propertyName,
      options: {
        message: "url must be an absolute URL using an allowed scheme and only known %VARIABLES%",
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return isWatchLinkUrl(value);
        },
      },
    });
  };
}
