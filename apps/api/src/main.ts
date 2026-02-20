import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

export function configureApp(app: INestApplication) {
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('A型事業所向け支援管理API')
    .setDescription('障害者就労継続支援A型事業所向け業務管理システム API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  app.getHttpAdapter().get('/api-docs-json', (_req: unknown, res: { json: (doc: unknown) => void }) => {
    res.json(document);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(3001);
}

bootstrap();
