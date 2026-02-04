import { Controller, Get, Post } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('download-excel')
  async downloadExcel() {
    return this.automationService.downloadExcel();
  }

  @Post('login')
  async loginOnly() {
    return this.automationService.loginOnly();
  }

  @Get('download-path')
  getDownloadPath() {
    return {
      downloadPath: (this.automationService as any).downloadPath,
      message: 'Ruta de descargas configurada'
    };
  }
}