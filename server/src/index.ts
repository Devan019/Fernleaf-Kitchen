import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module.js';

const server = express();

let app: any;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

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