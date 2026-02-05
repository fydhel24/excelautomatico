import { Controller, Post, Body, Get } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { AutomationService } from './automation.service';

@ApiTags('automatización')
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('configure-laravel-url')
  @ApiOperation({ 
    summary: 'Configurar URL de Laravel',
    description: 'Establece la URL base del backend Laravel donde se enviarán los archivos Excel descargados'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        url: { 
          type: 'string', 
          description: 'URL completa del endpoint Laravel para recibir Excel',
          example: 'http://localhost:3000/api/movimientos/importar-desde-nestjs' 
        },
      },
      required: ['url'],
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: 'URL configurada exitosamente',
    schema: {
      example: { 
        success: true, 
        message: 'URL de Laravel configurada exitosamente',
        url: 'http://localhost:3000/api/movimientos/importar-desde-nestjs'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'URL no proporcionada',
    schema: {
      example: { 
        success: false, 
        message: 'El campo "url" es requerido' 
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Descargar Excel y enviar a Laravel',
    description: 'Ejecuta el proceso completo de automatización: inicia sesión en BCP Bolivia, descarga archivo Excel con movimientos y lo envía al backend Laravel configurado'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Proceso completado exitosamente',
    schema: {
      example: { 
        success: true, 
        message: 'Excel descargado y enviado a Laravel exitosamente',
        excelPath: '/ruta/descargas/Reporte_1234567890.xlsx',
        laravelResponse: {
          success: true,
          message: 'Archivo procesado correctamente',
          registros: 45
        },
        timestamp: '2024-01-15T10:30:00.000Z',
        reusedSession: true
      }
    }
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Error en el proceso de automatización',
    schema: {
      example: { 
        success: false, 
        message: 'Error en el proceso: Falló el login' 
      }
    }
  })
  async downloadAndSendToLaravel() {
    return this.automationService.downloadExcelAndSendToLaravel();
  }

  @Get('session-status')
  @ApiOperation({ 
    summary: 'Verificar estado de sesión',
    description: 'Comprueba el estado actual de la sesión de Playwright: si el navegador está activo, si hay página abierta y si la sesión está iniciada'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado actual de la sesión',
    schema: {
      example: { 
        success: true,
        browserActive: true,
        pageActive: true,
        isLoggedIn: true,
        currentPageUrl: 'https://apppro.bcp.com.bo/Multiplica/Dashboard',
        message: 'Sesión activa y lista para descargar'
      }
    }
  })
  getSessionStatus() {
    const status = this.automationService.getSessionStatus();
    return {
      success: true,
      ...status,
      message: status.isLoggedIn ? 'Sesión activa y lista para descargar' : 'Sesión no iniciada'
    };
  }

  @Post('close-browser')
  @ApiOperation({ 
    summary: 'Cerrar navegador manualmente',
    description: 'Cierra la instancia del navegador Playwright y limpia la sesión. Útil para liberar recursos o reiniciar la sesión'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Navegador cerrado exitosamente',
    schema: {
      example: { 
        success: true, 
        message: 'Navegador cerrado exitosamente' 
      }
    }
  })
  async closeBrowser() {
    await this.automationService.closeBrowser();
    return {
      success: true,
      message: 'Navegador cerrado exitosamente'
    };
  }
}