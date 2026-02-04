import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'playwright'; // ✅ Importar de 'playwright'
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const StealthPlugin = stealth;
chromium.use(StealthPlugin());

@Injectable()
export class AutomationService {
  private downloadPath: string;
  private laravelApiUrl: string = 'http://localhost:8000/api/movimientos/importar-desde-nestjs';
  
  // Variables para mantener sesión REALMENTE persistente
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;
  private currentPageUrl: string = '';

  constructor() {
    this.downloadPath = path.join(process.cwd(), 'descargas');
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
      console.log(`📁 Directorio de descargas creado: ${this.downloadPath}`);
    }
  }

  // Espera aleatoria
  private async randomDelay(min: number, max: number) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Verificar si ya está logueado en la página actual
  private async isAlreadyLoggedIn(page: Page): Promise<boolean> {
    try {
      // Verificar si el botón de Excel existe (solo aparece cuando está logueado)
      const excelBtnExists = await page.evaluate(() => {
        return document.querySelector('button[title="Exportar a Excel"]') !== null;
      });

      if (excelBtnExists) {
        console.log('  ✓ Ya está logueado en la página actual');
        return true;
      }

      // Verificar si estamos en la página de login
      const currentUrl = page.url();
      if (currentUrl.includes('AuthIAM/Index')) {
        console.log('  ⚠️ Está en la página de login, necesita autenticarse');
        return false;
      }

      // Intentar navegar a una página que requiere login
      try {
        await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index    ', {
          waitUntil: 'networkidle',
          timeout: 10000
        });
        
        // Si después de navegar aparece el botón de Excel, está logueado
        const hasExcelBtn = await page.evaluate(() => {
          return document.querySelector('button[title="Exportar a Excel"]') !== null;
        });
        
        if (hasExcelBtn) {
          console.log('  ✓ Sesión activa detectada');
          return true;
        }
      } catch (navError) {
        // Error de navegación puede significar que la sesión expiró
      }

      return false;
    } catch (error) {
      console.error('Error verificando login:', error.message);
      return false;
    }
  }

  // Iniciar navegador (solo una vez)
  private async initializeBrowser(): Promise<{ browser: Browser; page: Page }> {
    console.log('🚀 Iniciando navegador Chromium (primera vez)...');
    
    const browser = await chromium.launch({ 
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--start-maximized'
      ]
    });
    
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    return { browser, page };
  }

  // Login (solo si no está logueado)
  private async performLogin(page: Page): Promise<boolean> {
    try {
      console.log('\n📝 Realizando login en BCP...');
      
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index    ', {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      console.log('  → Rellenando credenciales...');
      
      // Rellenar campos
      await page.fill('#authname', 'CajaUno11929');
      await this.randomDelay(300, 600);
      await page.fill('#authpass', '6ipzQ-5kOQ');
      
      await this.randomDelay(500, 1000);
      
      console.log('  → Haciendo clic en botón de login...');
      await page.click('#authbtn');
      
      // Esperar que cargue
      await page.waitForTimeout(2000);
      
      console.log('  ✓ Login exitoso\n');
      return true;

    } catch (error) {
      console.error('  ❌ Error en login:', error.message);
      return false;
    }
  }

  // Método principal: Descargar Excel y enviar a Laravel
  async downloadExcelAndSendToLaravel(): Promise<any> {
    let excelPath = '';

    try {
      // Verificar si ya hay un navegador iniciado
      if (!this.browser || !this.page) {
        console.log('🆕 Iniciando nueva sesión (primera vez)...\n');
        const init = await this.initializeBrowser();
        this.browser = init.browser;
        this.page = init.page;
        
        // Realizar login
        const loginSuccess = await this.performLogin(this.page);
        if (!loginSuccess) {
          throw new Error('Falló el login');
        }
        this.isLoggedIn = true;
        this.currentPageUrl = this.page.url();
      } else {
        console.log('🔄 Reutilizando sesión existente...\n');
        
        // Verificar si ya está logueado
        const alreadyLoggedIn = await this.isAlreadyLoggedIn(this.page);
        
        if (!alreadyLoggedIn) {
          console.log('  ⚠️ Sesión no activa, realizando login...\n');
          const loginSuccess = await this.performLogin(this.page);
          if (!loginSuccess) {
            throw new Error('Falló el login');
          }
          this.isLoggedIn = true;
        } else {
          console.log('  ✓ Sesión activa, procediendo a descargar Excel\n');
          this.isLoggedIn = true;
        }
      }

      // --- DESCARGA EXCEL ---
      console.log('📊 Descargando reporte Excel...');
      
      const excelBtn = 'button[title="Exportar a Excel"]';
      await this.page.waitForSelector(excelBtn, { timeout: 30000 });
      
      console.log('  → Haciendo clic en botón Exportar a Excel...');
      
      const [download] = await Promise.all([
        this.page.waitForEvent('download', { timeout: 60000 }),
        this.page.click(excelBtn),
      ]);
      
      const excelFileName = `Reporte_${Date.now()}.xlsx`;
      excelPath = path.join(this.downloadPath, excelFileName);
      await download.saveAs(excelPath);
      
      console.log(`  ✓ Excel guardado: ${excelPath}\n`);

      // --- ENVIAR A LARAVEL ---
      console.log('📤 Enviando Excel a Laravel...');
      const laravelResponse = await this.sendExcelToLaravel(excelPath);
      
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ PROCESO COMPLETADO EXITOSAMENTE                       ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Excel descargado y enviado a Laravel exitosamente',
        excelPath,
        laravelResponse,
        timestamp: new Date().toISOString(),
        reusedSession: this.isLoggedIn
      };

    } catch (error) {
      console.error('\n❌ ERROR en el proceso:', error.message);
      
      // Tomar screenshot del error
      try {
        if (this.page) {
          const errorScreenshot = path.join(this.downloadPath, `error_${Date.now()}.png`);
          await this.page.screenshot({ path: errorScreenshot });
          console.log(`📸 Screenshot del error guardado: ${errorScreenshot}`);
        }
      } catch (screenshotError) {
        console.error('No se pudo tomar screenshot:', screenshotError);
      }
      
      throw error;
    } finally {
      console.log('🏁 Proceso terminado.');
      console.log(`📁 Archivo guardado en: ${this.downloadPath}\n`);
      console.log('💡 Navegador permanece abierto para próxima descarga\n');
    }
  }

  // Método para enviar Excel a Laravel
  private async sendExcelToLaravel(excelPath: string): Promise<any> {
    try {
      if (!fs.existsSync(excelPath)) {
        throw new Error(`Archivo no encontrado: ${excelPath}`);
      }

      const formData = new FormData();
      formData.append('archivo_excel', fs.createReadStream(excelPath));
      formData.append('origen', 'nestjs');

      console.log(`  → Enviando a: ${this.laravelApiUrl}`);
      
      const response = await axios.post(this.laravelApiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
      });

      console.log(`  ✓ Laravel respondió: ${response.status} - ${response.data.message || 'OK'}\n`);
      
      return response.data;

    } catch (error) {
      console.error('  ❌ Error enviando a Laravel:', error.message);
      
      if (error.response) {
        console.error('  Response ', error.response.data);
        console.error('  Status:', error.response.status);
      }
      
      throw new Error(`Error enviando Excel a Laravel: ${error.message}`);
    }
  }

  // Método para cambiar la URL de Laravel
  setLaravelApiUrl(url: string) {
    this.laravelApiUrl = url;
  }

  getLaravelApiUrl() {
    return this.laravelApiUrl;
  }

  // Método para cerrar navegador manualmente
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
      console.log('👋 Navegador cerrado');
    }
  }

  // Método para verificar estado de la sesión
  getSessionStatus() {
    return {
      browserActive: this.browser !== null,
      pageActive: this.page !== null,
      isLoggedIn: this.isLoggedIn,
      currentPageUrl: this.currentPageUrl
    };
  }
}