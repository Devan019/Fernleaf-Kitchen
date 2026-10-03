import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const server = express();

let app: any;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    //swagger configuration 
    const config = new DocumentBuilder()
      .setTitle('Fernleaf Kitchen API')
      .setDescription('API Documentation for Fernleaf Kitchen')
      .setVersion('1.0')
      .build();

    //add swagger doc into our api app 
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);


    //CORS
    app.enableCors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    });

    await app.init();
  }

  return app;
}

//vercel handler - for serverless function
export default async function handler(req: any, res: any) {
  await bootstrap();
  server(req, res);
}