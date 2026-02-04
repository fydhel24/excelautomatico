import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
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

  constructor() {
    this.downloadPath = path.join(process.cwd(), 'descargas');
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
      console.log(`📁 Directorio de descargas creado: ${this.downloadPath}`);
    }
  }

  // Método para descargar Excel y enviar a Laravel
  async downloadExcelAndSendToLaravel(): Promise<any> {
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
    let excelPath = '';

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
      excelPath = path.join(this.downloadPath, excelFileName);
      await download.saveAs(excelPath);
      
      console.log(`  ✓ Excel guardado: ${excelPath}\n`);

      // --- PASO 3: ENVIAR A LARAVEL ---
      console.log('📤 PASO 3: Enviando Excel a Laravel...');
      const laravelResponse = await this.sendExcelToLaravel(excelPath);
      
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ PROCESO COMPLETADO EXITOSAMENTE                       ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Excel descargado y enviado a Laravel exitosamente',
        excelPath,
        laravelResponse,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('\n❌ ERROR en el proceso:', error.message);
      throw error;
    } finally {
      console.log('🏁 Proceso terminado.');
      console.log(`📁 Archivo guardado en: ${this.downloadPath}\n`);
      // await browser.close();
    }
  }

  // Método para solo descargar Excel
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
      console.log('  ✓ Login exitoso\n');

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
      
      console.log(`  ✓ Excel guardado: ${excelPath}\n`);

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ EXCEL DESCARGADO EXITOSAMENTE                         ║');
      console.log('╚═══════════════════════════════════════════════════════════╝\n');

      return {
        success: true,
        message: 'Excel descargado exitosamente',
        excelPath,
        fileName: excelFileName,
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

  // Método para enviar Excel existente a Laravel
  async sendExcelToLaravel(excelPath: string): Promise<any> {
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

  // Método para enviar Excel por ruta de archivo
  async sendFileToLaravel(filePath: string): Promise<any> {
    const fullPath = path.join(this.downloadPath, filePath);
    return this.sendExcelToLaravel(fullPath);
  }

  // Método para listar archivos descargados
  listDownloadedFiles(): any[] {
    try {
      const files = fs.readdirSync(this.downloadPath);
      return files
        .filter(file => file.endsWith('.xlsx'))
        .map(file => ({
          name: file,
          path: path.join(this.downloadPath, file),
          size: fs.statSync(path.join(this.downloadPath, file)).size,
          modified: fs.statSync(path.join(this.downloadPath, file)).mtime
        }));
    } catch (error) {
      console.error('Error listando archivos:', error);
      return [];
    }
  }

  // Método para cambiar la URL de Laravel
  setLaravelApiUrl(url: string) {
    this.laravelApiUrl = url;
  }

  getLaravelApiUrl() {
    return this.laravelApiUrl;
  }
}