import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";

const HIDDEN_TAGS = new Set(["Default", "Magic-link", "Username"]);

export async function buildMergedDocument(app: INestApplication, betterAuthInstance: any): Promise<OpenAPIObject> {
  const swaggerConfig = new DocumentBuilder()
    .setTitle("TrackGeek")
    .setDescription("The TrackGeek API documentation")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  const betterAuthSchema = await betterAuthInstance?.api?.generateOpenAPISchema();

  const processedBetterAuthPaths = Object.fromEntries(
    Object.entries(betterAuthSchema.paths ?? {}).map(([path, pathItem]: any) => {
      const newPath = `/auth${path}`;

      const newPathItem = Object.fromEntries(
        Object.entries(pathItem).map(([method, operation]: any) => {
          if (typeof operation === "object" && "responses" in operation) {
            return [method, { ...operation, tags: ["Auth"] }];
          }
          return [method, operation];
        }),
      );

      return [newPath, newPathItem];
    }),
  );

  const mergedDocument: OpenAPIObject = {
    ...swaggerDocument,
    paths: {
      ...processedBetterAuthPaths,
      ...swaggerDocument.paths,
    },
    components: {
      ...betterAuthSchema.components,
      schemas: {
        ...betterAuthSchema.components?.schemas,
        ...swaggerDocument.components?.schemas,
      },
    },
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      ...new Map(
        [
          ...(betterAuthSchema.tags ?? []).filter((t: any) => !HIDDEN_TAGS.has(t.name)),
          ...(swaggerDocument.tags ?? []),
        ].map((t: any) => [t.name, t]),
      ).values(),
    ],
  };

  return mergedDocument;
}
