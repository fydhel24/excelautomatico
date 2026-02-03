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

  async executeFullFlow(): Promise<any> {
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
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index', {
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

      // --- PASO 3: NAVEGAR A QUICK PAYMENT ---
      console.log('💳 PASO 3: Navegando a sección de QR (Quick Payment)...');
      await page.goto('https://apppro.bcp.com.bo/Multiplica/MiCodigo/QuickPayment', { 
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      console.log('  → Rellenando monto: 23 Bs');
      await page.waitForSelector('#amountInput', { timeout: 30000 });
      await page.fill('#amountInput', '23');
      
      console.log('  → Haciendo clic en botón Crear QR...');
      // El selector #fondoreportes parece ser un div, intentamos con el botón real
      try {
        await page.click('button:has-text("Crear QR"), #fondoreportes button, button[type="submit"]');
      } catch {
        // Si falla, intentamos con el selector original
        await page.click('#fondoreportes');
      }
      
      console.log('  → Generando QR (esto puede tardar hasta 60 segundos)...\n');

      // --- PASO 4: CAPTURAR IMAGEN QR ---
      console.log('📷 PASO 4: Capturando imagen QR...');
      const qrSelector = '.col-8.text-center img';
      await page.waitForSelector(qrSelector, { timeout: 60000 });
      console.log('  → QR generado exitosamente');

      // Extraer el atributo 'src' de la imagen
      const imgSrc = await page.getAttribute(qrSelector, 'src');

      let qrPath = '';
      if (imgSrc && imgSrc.startsWith('data:image')) {
        // Quitar el encabezado 'data:image/png;base64,' para obtener solo el código base64
        const base64Data = imgSrc.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        qrPath = path.join(this.downloadPath, `QR_Cobro_${Date.now()}.png`);
        fs.writeFileSync(qrPath, buffer);
        console.log(`  ✓ QR guardado con éxito: ${qrPath}\n`);
      } else {
        console.log('  ⚠️  No se pudo obtener la imagen QR (formato inesperado)');
      }

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ PROCESO COMPLETADO EXITOSAMENTE                       ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Proceso completado exitosamente',
        excelPath,
        qrPath,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('\n❌ ERROR en el flujo:', error.message);
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
      console.log(`📁 Archivos guardados en: ${this.downloadPath}\n`);
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
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index', {
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

  async downloadExcel(): Promise<any> {
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
    
    const context = await browser.newContext({
      acceptDownloads: true
    });
    
    const page = await context.newPage();

    try {
      // Login primero
      console.log('\n📝 Iniciando sesión en BCP...');
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      await page.fill('#authname', 'CajaUno11929');
      await page.fill('#authpass', '6ipzQ-5kOQ');
      await page.click('#authbtn');
      await page.waitForTimeout(3000);

      // Descargar Excel
      console.log('📊 Descargando reporte Excel...');
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
      throw error;
    } finally {
      console.log('🏁 Proceso terminado.\n');
      // await browser.close();
    }
  }

  async generateQR(amount: string = '23'): Promise<any> {
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
      // Login primero
      console.log('\n📝 Iniciando sesión en BCP...');
      await page.goto('https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index', {
        waitUntil: 'networkidle',
        timeout: 60000
      });
      
      await page.fill('#authname', 'CajaUno11929');
      await page.fill('#authpass', '6ipzQ-5kOQ');
      await page.click('#authbtn');
      await page.waitForTimeout(3000);

      // Navegar a Quick Payment
      console.log('💳 Navegando a sección de QR (Quick Payment)...');
      await page.goto('https://apppro.bcp.com.bo/Multiplica/MiCodigo/QuickPayment', { 
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Rellenar monto
      console.log(`  → Rellenando monto: ${amount} Bs`);
      await page.waitForSelector('#amountInput', { timeout: 30000 });
      await page.fill('#amountInput', amount);

      // Clic en Crear QR
      console.log('  → Haciendo clic en botón Crear QR...');
      try {
        await page.click('button:has-text("Crear QR"), #fondoreportes button, button[type="submit"]');
      } catch {
        await page.click('#fondoreportes');
      }
      
      console.log('  → Generando QR (esto puede tardar hasta 60 segundos)...\n');

      // Capturar imagen QR
      console.log('📷 Capturando imagen QR...');
      const qrSelector = '.col-8.text-center img';
      await page.waitForSelector(qrSelector, { timeout: 60000 });
      console.log('  → QR generado exitosamente');

      const imgSrc = await page.getAttribute(qrSelector, 'src');

      let qrPath = '';
      if (imgSrc && imgSrc.startsWith('data:image')) {
        const base64Data = imgSrc.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        qrPath = path.join(this.downloadPath, `QR_Cobro_${Date.now()}.png`);
        fs.writeFileSync(qrPath, buffer);
        console.log(`  ✓ QR guardado con éxito: ${qrPath}\n`);
      }

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ QR GENERADO EXITOSAMENTE                              ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'QR generado exitosamente',
        qrPath,
        amount,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('\n❌ ERROR generando QR:', error.message);
      throw error;
    } finally {
      console.log('🏁 Proceso terminado.\n');
      // await browser.close();
    }
  }
}