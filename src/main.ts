import { HttpStatus, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bodyParser from "body-parser";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./shared/filters/http-exception.filter";
import { setupDocs } from "./shared/infra/docs/setup";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
    cors: {
      origin: process.env.WEB_URL,
      credentials: true,
    },
  });

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
  }

  await app.listen(process.env.PORT!, () => {
    const url = `http://localhost:${process.env.PORT}`;

    logger.log(`Server is running on ${url}`);
    logger.log(`API documentation available at ${url}/docs`);
  });
}

bootstrap();
