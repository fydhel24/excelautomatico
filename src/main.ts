import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AutomationService } from './automation/automation.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para desarrollo
  app.enableCors();
  
  // Puerto configurable
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`🚀 Aplicación corriendo en http://localhost:${port}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   POST /automation/download-excel`);
  console.log(`   POST /automation/login`);
  console.log(`   GET  /automation/download-path`);
  
  // ✅ EJECUTAR DESCARGA DE EXCEL AUTOMÁTICAMENTE AL INICIAR
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  EJECUTANDO DESCARGA DE EXCEL AUTOMÁTICAMENTE...          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const automationService = app.get(AutomationService);
  
  // Ejecutar la descarga de Excel
  try {
    await automationService.downloadExcel();
  } catch (error) {
    console.error('❌ Error ejecutando descarga automática:', error);
  }
}

bootstrap();