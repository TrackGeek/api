import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('Track Verse')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'accessToken'
    )
    .build();
    
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('docs', app, documentFactory);
  
  await app.listen(process.env.PORT!);
}

bootstrap();
