import { INestApplication } from "@nestjs/common";
import { apiReference as scalarApiReference } from "@scalar/nestjs-api-reference";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { buildScalarConfig } from "./scalar";
import { buildMergedDocument } from "./swagger";

export async function setupDocs(app: INestApplication): Promise<void> {
  const authService = app.get(AuthService);
  const betterAuthInstance = (authService as any)?.options?.auth;

  const mergedDocument = await buildMergedDocument(app, betterAuthInstance);

  // Override helmet's strict CSP for the /docs route so Scalar's CDN script and inline scripts are allowed.
  app.use("/docs", (_req: any, res: any, next: any) => {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' https:",
        "worker-src 'self' blob:",
        "connect-src 'self' https:",
      ].join("; "),
    );
    next();
  });

  app.use("/docs", scalarApiReference(buildScalarConfig(mergedDocument)));
}
