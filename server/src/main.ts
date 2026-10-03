import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Fernleaf Kitchen API')
    .setDescription('API Documentation for Fernleaf Kitchen')
    .setVersion('1.0')
    .build();

  //add swagger doc into our api app 
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customCssUrl: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
    ],
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });


  //cors
  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });


  await app.listen(process.env.PORT ?? 8000);
}
await bootstrap();
