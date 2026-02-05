// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // 👈 Importar ConfigModule
import { AutomationModule } from './automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({  // 👈 Configurar para leer .env
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    AutomationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}