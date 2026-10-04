import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const server = express();

let initialized = false;

async function bootstrap() {
  if (initialized) {
    return;
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  //api prefix
  app.setGlobalPrefix('api');

  // Cookie parser
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Fernleaf Kitchen API')
    .setDescription('API Documentation for Fernleaf Kitchen')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('token')
    .build();

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

  await app.init();
  initialized = true;
}

// Vercel handler - for serverless function
export default async function handler(req: any, res: any) {
  await bootstrap();
  return server(req, res);
}
