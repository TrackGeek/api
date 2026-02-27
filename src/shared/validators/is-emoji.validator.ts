import { registerDecorator, ValidationOptions } from "class-validator";
import emojiRegex from "emoji-regex";

export function IsEmoji(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "isEmoji",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!value) return false;

          const regex = emojiRegex();
          const matches = value.match(regex);

          return matches?.length === 1 && matches[0] === value;
        },
      },
    });
  };
}
