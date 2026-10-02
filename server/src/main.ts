import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //cors
  app.enableCors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  });


  await app.listen(process.env.PORT ?? 8000);
}
await bootstrap();
