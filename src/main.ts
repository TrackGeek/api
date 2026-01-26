import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
	const logger = new Logger("Bootstrap");

	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: process.env.WEB_URL,
		credentials: true,
	});

	app.use(cookieParser());

	const config = new DocumentBuilder()
		.setTitle("Track Geek")
		.setDescription("The Track Geek API documentation")
		.setVersion("1.0.0")
		.build();

	const documentFactory = () => SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("docs", app, documentFactory); // Path: /docs

	await app.listen(process.env.PORT!, () =>
		logger.log(`Server is running on http://0.0.0.0:${process.env.PORT}`),
	);
}

bootstrap();
