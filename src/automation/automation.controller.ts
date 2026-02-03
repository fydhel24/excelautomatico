import { Controller, Get, Post, Body } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('execute-full-flow')
  async executeFullFlow() {
    return this.automationService.executeFullFlow();
  }

  @Post('login')
  async loginOnly() {
    return this.automationService.loginOnly();
  }

  @Post('download-excel')
  async downloadExcel() {
    return this.automationService.downloadExcel();
  }

  @Post('generate-qr')
  async generateQR(@Body() body: { amount?: string }) {
    const amount = body.amount || '23';
    return this.automationService.generateQR(amount);
  }

  @Get('download-path')
  getDownloadPath() {
    return {
      downloadPath: (this.automationService as any).downloadPath,
      message: 'Ruta de descargas configurada'
    };
  }
}