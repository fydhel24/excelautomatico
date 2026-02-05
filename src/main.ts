import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
  
  // Configuración de Swagger con Scalar UI
  const config = new DocumentBuilder()
    .setTitle('Automatización BCP - NestJS API')
    .setDescription('API para automatización web con Playwright: Descarga de Excel desde BCP Bolivia y envío a Laravel')
    .setVersion('1.0')
    .addTag('automatización')
    .addTag('playwright')
    .addTag('bcp-bolivia')
    .addTag('excel')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Configurar Scalar UI
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'API Automatización BCP - Documentación',
    swaggerOptions: {
      persistAuthorization: true,
    },
    customCss: `
      .swagger-ui .topbar {
        background-color: #10b981;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      .swagger-ui .scheme-container {
        background-color: #f9fafb;
      }
      .swagger-ui .info .title small {
        background-color: #10b981;
      }
    `,
  });

  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`🚀 NestJS API corriendo en http://localhost:${port}`);
  console.log(`📄 Documentación: http://localhost:${port}/docs`);
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