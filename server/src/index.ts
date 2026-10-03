import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const server = express();

let initialized = false;

async function bootstrap() {

  if (initialized) {
    return;
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  //CORS
  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });

  //swagger configuration 
  const config = new DocumentBuilder()
    .setTitle('Fernleaf Kitchen API')
    .setDescription('API Documentation for Fernleaf Kitchen')
    .setVersion('1.0')
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


//vercel handler - for serverless function
export default async function handler(req: any, res: any) {
  await bootstrap();
  return server(req, res);
}