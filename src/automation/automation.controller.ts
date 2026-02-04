import { Controller, Post, Body, Get } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('configure-laravel-url')
  configureLaravelUrl(@Body() body: { url: string }) {
    if (!body.url) {
      return {
        success: false,
        message: 'El campo "url" es requerido'
      };
    }

    this.automationService.setLaravelApiUrl(body.url);
    return {
      success: true,
      message: 'URL de Laravel configurada exitosamente',
      url: this.automationService.getLaravelApiUrl()
    };
  }

  @Post('download-and-send')
  async downloadAndSendToLaravel() {
    return this.automationService.downloadExcelAndSendToLaravel();
  }

  @Get('session-status')
  getSessionStatus() {
    const status = this.automationService.getSessionStatus();
    return {
      success: true,
      ...status,
      message: status.isLoggedIn ? 'Sesión activa y lista para descargar' : 'Sesión no iniciada'
    };
  }

  @Post('close-browser')
  async closeBrowser() {
    await this.automationService.closeBrowser();
    return {
      success: true,
      message: 'Navegador cerrado exitosamente'
    };
  }
}