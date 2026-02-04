import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const StealthPlugin = stealth;
chromium.use(StealthPlugin());

@Injectable()
export class AutomationService {
  private downloadPath: string;
  private laravelApiUrl: string = 'https://test.importadoramiranda.com/api/movimientos/importar-desde-nestjs';
  
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

  // Espera con typing effect (simulación humana)
  private async typeWithDelay(page: Page, selector: string, text: string) {
    await page.click(selector);
    await page.fill(selector, '');
    
    for (const char of text) {
      await page.keyboard.type(char);
      await this.randomDelay(50, 150); // Delay entre caracteres
    }
  }

  // Simular comportamiento humano (mouse movement, scroll, etc.)
  private async simulateHumanBehavior(page: Page) {
    console.log('  → Simulando comportamiento humano...');
    
    // Espera aleatoria entre 1-3 segundos
    await this.randomDelay(1000, 3000);
    
    // Scroll suave hacia abajo y arriba
    try {
      await page.evaluate(() => {
        window.scrollTo({ top: 200, behavior: 'smooth' });
      });
      await this.randomDelay(500, 1000);
      
      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      await this.randomDelay(500, 1000);
    } catch (e) {
      // Ignorar errores de scroll en headless
    }
    
    console.log('  ✓ Comportamiento humano simulado\n');
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
        await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index        ', {
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

  // Iniciar navegador (solo una vez) - CONFIGURACIÓN PARA LINUX
  private async initializeBrowser(): Promise<{ browser: Browser; page: Page }> {
    console.log('🚀 Iniciando navegador Chromium (modo headless para Linux)...');
    
    const browser = await chromium.launch({ 
      headless: true, // ✅ MODO HEADLESS PARA LINUX
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-infobars',
        '--window-size=1366,768',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'es-ES',
      timezoneId: 'America/La_Paz'
    });
    
    const page = await context.newPage();
    
    // Evitar detección de bot
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
    
    return { browser, page };
  }

  // Login (solo si no está logueado) - CON SIMULACIÓN HUMANA
  private async performLogin(page: Page): Promise<boolean> {
    try {
      console.log('\n📝 Realizando login en BCP...');
      
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index        ', {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Simular comportamiento humano antes de login
      await this.simulateHumanBehavior(page);

      console.log('  → Rellenando credenciales con typing effect...');
      
      // Usar typing effect para simular humano
      await this.typeWithDelay(page, '#authname', 'CajaUno11929');
      await this.randomDelay(300, 600);
      await this.typeWithDelay(page, '#authpass', '6ipzQ-5kOQ');
      
      await this.randomDelay(500, 1000);
      
      console.log('  → Haciendo clic en botón de login...');
      
      // Simular hover antes de clic (aunque sea headless)
      await this.randomDelay(200, 500);
      
      await page.click('#authbtn');
      
      // Esperar con timeout variable (simulación humana)
      await this.randomDelay(2000, 4000);
      
      console.log('  ✓ Login exitoso\n');
      return true;

    } catch (error) {
      console.error('  ❌ Error en login:', error.message);
      return false;
    }
  }

  // Recargar página para obtener datos actualizados
  private async refreshPageForLatestData(page: Page): Promise<void> {
    console.log('🔄 Recargando página para obtener datos actualizados...');
    
    // Recargar la página actual
    await page.reload({
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Esperar un poco para que los datos se actualicen (simulación humana)
    await this.randomDelay(2000, 3000);
    
    console.log('  ✓ Página recargada con datos actualizados\n');
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
        
        // Realizar login con simulación humana
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
          console.log('  ✓ Sesión activa detectada\n');
          
          // ✅ RECARGAR PÁGINA PARA OBTENER DATOS ACTUALIZADOS
          await this.refreshPageForLatestData(this.page);
          
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
      
      // Tomar screenshot del error (funciona en headless)
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