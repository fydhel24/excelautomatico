import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AutomationService } from './automation/automation.service';

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
  console.log(`POST /automation/configure-laravel-url - Configurar URL de Laravel`);
  console.log(`POST /automation/download-and-send      - Descargar Excel y enviar a Laravel`);
  console.log(`GET  /automation/session-status          - Verificar estado de sesión`);
  console.log(`POST /automation/close-browser           - Cerrar navegador manualmente\n`);
  console.log(`💡 El navegador permanece ABIERTO entre llamadas\n`);
  
  // Obtener instancia del service para manejar cierre limpio
  const automationService = app.get(AutomationService);
  
  // Cerrar navegador al terminar la aplicación
  process.on('SIGINT', async () => {
    console.log('\n👋 Cerrando aplicación...');
    await automationService.closeBrowser();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n👋 Cerrando aplicación...');
    await automationService.closeBrowser();
    process.exit(0);
  });
}

bootstrap();