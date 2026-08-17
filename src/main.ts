import { HttpStatus, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./shared/filters/http-exception.filter";
import { setupDocs } from "./shared/infra/docs/setup";

function resolveTrustProxy(): number | string | boolean {
  const value = process.env.TRUST_PROXY;

  if (!value) return 1;

  if (value === "true" || value === "false") return value === "true";

  const hops = Number(value);

  // A non-numeric value is an IP/CIDR allow-list, which Express accepts as-is.
  return Number.isNaN(hops) ? value : hops;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    cors: {
      origin: process.env.WEB_URL,
      credentials: true,
    },
  });

  app.set("trust proxy", resolveTrustProxy());

  app.use(
    bodyParser.json({
      verify: (req: any, _res: any, buffer: any) => {
        if (req?.originalUrl?.startsWith("/stripe/webhook")) {
          req.rawBody = buffer;
        }
      },
    }),
  );

  app.use(helmet());

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV === "development") {
    await setupDocs(app);

    const httpLogger = new Logger("HTTP");

    app.use((req: any, res: any, next: any) => {
      const { method, originalUrl } = req;

      const startTime = Date.now();

      httpLogger.debug(`[Start] ${method} ${originalUrl} --- --- ---`);

      res.on("finish", () => {
        const ms = Date.now() - startTime;
        const minutes = String(Math.floor(ms / 60000)).padStart(2, "0");
        const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
        const millis = String(ms % 1000).padStart(3, "0");

        httpLogger.debug(
          `[Finish] ${method} ${originalUrl} ${res.statusCode} +${millis}ms (${minutes}:${seconds}.${millis})`,
        );
      });

      next();
    });
  }

  await app.listen(process.env.PORT!, () => {
    const bootstrapLogger = new Logger("Bootstrap");

    const url = `http://localhost:${process.env.PORT}`;

    bootstrapLogger.log(`Server is running on ${url}`);
    bootstrapLogger.log(`API documentation available at ${url}/docs`);
  });
}

bootstrap();
