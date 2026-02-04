import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs';
import * as path from 'path';

// Configurar stealth plugin correctamente
const StealthPlugin = stealth;
chromium.use(StealthPlugin());

@Injectable()
export class AutomationService {
  private downloadPath: string;

  constructor() {
    // Crear ruta de descargas relativa al directorio de ejecución
    this.downloadPath = path.join(process.cwd(), 'descargas');
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
      console.log(`📁 Directorio de descargas creado: ${this.downloadPath}`);
    }
  }

  async downloadExcel(): Promise<any> {
    console.log('🚀 Iniciando navegador Chromium...');
    
    const browser = await chromium.launch({ 
      headless: false, // Muestra la ventana del navegador
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const context = await browser.newContext({
      acceptDownloads: true
    });
    
    const page = await context.newPage();

    try {
      // --- PASO 1: LOGIN ---
      console.log('\n📝 PASO 1: Iniciando sesión en BCP...');
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index  ', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      console.log('  → Rellenando credenciales...');
      await page.fill('#authname', 'CajaUno11929');
      await page.fill('#authpass', '6ipzQ-5kOQ');
      
      console.log('  → Haciendo clic en botón de login...');
      await page.click('#authbtn');
      
      // Esperar que la página cargue después del login
      await page.waitForTimeout(3000);
      console.log('  ✓ Login exitoso\n');

      // --- PASO 2: DESCARGA EXCEL ---
      console.log('📊 PASO 2: Descargando reporte Excel...');
      const excelBtn = 'button[title="Exportar a Excel"]';
      await page.waitForSelector(excelBtn, { timeout: 30000 });
      
      console.log('  → Haciendo clic en botón Exportar a Excel...');
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 60000 }),
        page.click(excelBtn),
      ]);
      
      const excelFileName = `Reporte_${Date.now()}.xlsx`;
      const excelPath = path.join(this.downloadPath, excelFileName);
      await download.saveAs(excelPath);
      
      console.log(`  ✓ Excel guardado: ${excelPath}\n`);

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ EXCEL DESCARGADO EXITOSAMENTE                         ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Excel descargado exitosamente',
        excelPath,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('\n❌ ERROR descargando Excel:', error.message);
      console.error('Stack:', error.stack);
      
      // Tomar screenshot del error
      try {
        const errorScreenshot = path.join(this.downloadPath, `error_${Date.now()}.png`);
        await page.screenshot({ path: errorScreenshot });
        console.log(`📸 Screenshot del error guardado: ${errorScreenshot}`);
      } catch (screenshotError) {
        console.error('No se pudo tomar screenshot:', screenshotError);
      }
      
      throw error;
    } finally {
      console.log('🏁 Proceso terminado.');
      console.log(`📁 Archivo guardado en: ${this.downloadPath}\n`);
      // await browser.close(); // Descomenta para cerrar automáticamente el navegador
    }
  }

  async loginOnly(): Promise<any> {
    console.log('🚀 Iniciando navegador Chromium...');
    
    const browser = await chromium.launch({ 
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log('\n📝 Iniciando sesión en BCP...');
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index  ', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      console.log('  → Rellenando credenciales...');
      await page.fill('#authname', 'CajaUno11929');
      await page.fill('#authpass', '6ipzQ-5kOQ');
      
      console.log('  → Haciendo clic en botón de login...');
      await page.click('#authbtn');
      
      await page.waitForTimeout(3000);
      
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ LOGIN EXITOSO                                         ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Login exitoso',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('\n❌ ERROR en login:', error.message);
      throw error;
    } finally {
      console.log('🏁 Proceso terminado.\n');
      // await browser.close();
    }
  }
}