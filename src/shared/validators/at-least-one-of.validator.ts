import { registerDecorator, ValidationOptions } from "class-validator";

export function AtLeastOneOf(fields: string[], validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "atLeastOneOf",
      target: object.constructor,
      propertyName,
      options: {
        message: `At least one of the following fields must be provided: ${fields.join(", ")}`,
        ...validationOptions,
      },
      validator: {
        validate(_value: any, args: any) {
          const obj = args.object;
          return fields.some((field) => {
            const value = obj[field];
            if (typeof value === "string") return value.trim().length > 0;
            return value !== undefined && value !== null;
          });
        },
      },
    });
  };
}
