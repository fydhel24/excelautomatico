import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * @description Descarga Excel desde BCP y lo envía automáticamente a Laravel
   * @route POST /automation/download-and-send
   */
  @Post('download-and-send')
  async downloadAndSendToLaravel() {
    return this.automationService.downloadExcelAndSendToLaravel();
  }

  /**
   * @description Solo descarga el Excel desde BCP (sin enviar a Laravel)
   * @route POST /automation/download-excel
   */
  @Post('download-excel')
  async downloadExcel() {
    return this.automationService.downloadExcel();
  }

  /**
   * @description Lista todos los archivos Excel descargados
   * @route GET /automation/list-files
   */
  @Get('list-files')
  listFiles() {
    return {
      success: true,
      files: this.automationService.listDownloadedFiles(),
      count: this.automationService.listDownloadedFiles().length
    };
  }

  /**
   * @description Envía un archivo Excel específico a Laravel
   * @route POST /automation/send-to-laravel
   * @body { filePath: string } - Nombre del archivo (ej: "Reporte_1234567890.xlsx")
   */
  @Post('send-to-laravel')
  async sendToLaravel(@Body() body: { filePath: string }) {
    if (!body.filePath) {
      return {
        success: false,
        message: 'El campo "filePath" es requerido'
      };
    }

    try {
      const response = await this.automationService.sendFileToLaravel(body.filePath);
      return {
        success: true,
        message: 'Archivo enviado a Laravel exitosamente',
        laravelResponse: response
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * @description Configura la URL de la API de Laravel
   * @route POST /automation/configure-laravel-url
   * @body { url: string } - URL completa del endpoint de Laravel
   */
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

  /**
   * @description Obtiene la URL actual de la API de Laravel
   * @route GET /automation/laravel-url
   */
  @Get('laravel-url')
  getLaravelUrl() {
    return {
      url: this.automationService.getLaravelApiUrl()
    };
  }

  /**
   * @description Obtiene la ruta de descargas
   * @route GET /automation/download-path
   */
  @Get('download-path')
  getDownloadPath() {
    return {
      downloadPath: (this.automationService as any).downloadPath,
      message: 'Ruta de descargas configurada'
    };
  }
}