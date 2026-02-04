import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para Postman y desarrollo
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`🚀 NestJS API corriendo en http://localhost:${port}`);
  console.log(`\n📊 ENDPOINTS DISPONIBLES:\n`);
  console.log(`POST  /automation/download-and-send    - Descargar Excel y enviar a Laravel`);
  console.log(`POST  /automation/download-excel        - Solo descargar Excel`);
  console.log(`GET   /automation/list-files            - Listar archivos descargados`);
  console.log(`POST  /automation/send-to-laravel       - Enviar archivo específico a Laravel`);
  console.log(`POST  /automation/configure-laravel-url - Configurar URL de Laravel`);
  console.log(`GET   /automation/laravel-url           - Obtener URL actual de Laravel`);
  console.log(`GET   /automation/download-path         - Obtener ruta de descargas\n`);
  console.log(`💡 Prueba los endpoints con Postman\n`);
}

bootstrap();