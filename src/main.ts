import { HttpStatus, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./shared/filters/http-exception.filter";

async function bootstrap() {
	const logger = new Logger("Bootstrap");

	const app = await NestFactory.create(AppModule, {
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
		const config = new DocumentBuilder()
			.setTitle("Track Geek")
			.setDescription("The Track Geek API documentation")
			.setVersion("1.0.0")
			.build();

		const documentFactory = () => SwaggerModule.createDocument(app, config);

		SwaggerModule.setup("docs", app, documentFactory); // Path: /docs
	}

	await app.listen(process.env.PORT!, () =>
		logger.log(`Server is running on http://0.0.0.0:${process.env.PORT}`),
	);
}

bootstrap();
