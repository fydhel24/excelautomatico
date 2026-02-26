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
  private laravelApiUrl: string =
    'https://test.importadoramiranda.com/api/movimientos/importar-desde-nestjs  ';

  private browser: Browser | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;
  private currentPageUrl = '';

  // Variables para la sesión alternativa
  private browserAlt: Browser | null = null;
  private pageAlt: Page | null = null;
  private isLoggedInAlt = false;
  private currentPageUrlAlt = '';

  constructor() {
    this.downloadPath = path.join(process.cwd(), 'descargas');
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
      console.log(`📁 [INIT] Directorio creado: ${this.downloadPath}`);
    }
  }

  /* ─────────── UTILIDADES ─────────── */

  private async randomDelay(min: number, max: number) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async typeWithDelay(page: Page, selector: string, text: string) {
    // Usar fill directamente para mayor velocidad
    await page.fill(selector, text);
  }

  private async simulateHumanBehavior(page: Page) {
    // Reducido: solo un pequeño delay
    await this.randomDelay(50, 100);
  }

  /* ─────────── CHECK LOGIN ─────────── */

  private async isAlreadyLoggedIn(page: Page): Promise<boolean> {
    try {
      const logged =
        (await page.$('button[title="Exportar a Excel"]')) !== null;
      return logged;
    } catch {
      return false;
    }
  }

  /* ─────────── INIT BROWSER ─────────── */

  private async initializeBrowser(): Promise<{ browser: Browser; page: Page }> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1366,768',
      ],
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1366, height: 768 },
      locale: 'es-ES',
      timezoneId: 'America/La_Paz',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    return { browser, page };
  }

  /* ─────────── LOGIN PRINCIPAL ─────────── */

  private async performLogin(page: Page): Promise<boolean> {
    try {
      await page.goto(
        'https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index  ',
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      await this.simulateHumanBehavior(page);

      // Credenciales principales
      await this.typeWithDelay(page, '#authname', 'CajaUno11929');
      await this.typeWithDelay(page, '#authpass', '6ipzQ-5kOQ');

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        }),
        page.click('#authbtn'),
      ]);

      this.isLoggedIn = true;
      this.currentPageUrl = page.url();

      return true;
    } catch (error) {
      console.error('❌ [LOGIN] Error en login:', error.message);
      return false;
    }
  }

  /* ─────────── LOGIN ALTERNATIVO ─────────── */

  private async performLoginAlt(page: Page): Promise<boolean> {
    try {
      await page.goto(
        'https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index  ',
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      await this.simulateHumanBehavior(page);

      // Credenciales alternativas
      await this.typeWithDelay(page, '#authname', 'CajaLive114559');
      await this.typeWithDelay(page, '#authpass', 'hXDfP-cj2w');

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        }),
        page.click('#authbtn'),
      ]);

      this.isLoggedInAlt = true;
      this.currentPageUrlAlt = page.url();

      return true;
    } catch (error) {
      console.error('❌ [LOGIN-ALT] Error en login:', error.message);
      return false;
    }
  }

  /* ─────────── REFRESH ─────────── */

  private async refreshPageForLatestData(page: Page) {
    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await this.randomDelay(200, 400);
  }

  /* ─────────── ELIMINAR ARCHIVO ─────────── */

  private async deleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ [DELETE] Archivo eliminado: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ [DELETE] Error al eliminar archivo:`, error.message);
    }
  }

  /* ─────────── LARAVEL ─────────── */

  private async sendExcelToLaravel(excelPath: string) {
    const formData = new FormData();
    formData.append('archivo_excel', fs.createReadStream(excelPath));
    formData.append('origen', 'nestjs');

    const response = await axios.post(this.laravelApiUrl, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
      maxBodyLength: Infinity,
    });

    // Eliminar archivo después de enviar a Laravel
    await this.deleteFile(excelPath);

    return response.data;
  }

  /* ─────────── MAIN PRINCIPAL ─────────── */

  async downloadExcelAndSendToLaravel() {
    let excelPath = '';

    if (!this.browser || !this.page) {
      const init = await this.initializeBrowser();
      this.browser = init.browser;
      this.page = init.page;

      if (!(await this.performLogin(this.page))) {
        throw new Error('Falló el login con credenciales principales');
      }
    } else {
      if (!(await this.isAlreadyLoggedIn(this.page))) {
        if (!(await this.performLogin(this.page))) {
          throw new Error('Falló el login con credenciales principales');
        }
      } else {
        await this.refreshPageForLatestData(this.page);
      }
    }

    const excelBtn = 'button[title="Exportar a Excel"]';
    await this.page!.waitForSelector(excelBtn, { timeout: 20000 });

    const [download] = await Promise.all([
      this.page!.waitForEvent('download', { timeout: 30000 }),
      this.page!.click(excelBtn),
    ]);

    excelPath = path.join(
      this.downloadPath,
      `Reporte_${Date.now()}.xlsx`,
    );

    await download.saveAs(excelPath);

    const laravelResponse = await this.sendExcelToLaravel(excelPath);

    return {
      success: true,
      message: 'Excel descargado y enviado a Laravel exitosamente',
      excelPath,
      laravelResponse,
      timestamp: new Date().toISOString(),
      reusedSession: this.isLoggedIn,
    };
  }

  /* ─────────── MAIN ALTERNATIVO ─────────── */

  async downloadExcelAndSendToLaravelAlt() {
    let excelPath = '';

    if (!this.browserAlt || !this.pageAlt) {
      const init = await this.initializeBrowser();
      this.browserAlt = init.browser;
      this.pageAlt = init.page;

      if (!(await this.performLoginAlt(this.pageAlt))) {
        throw new Error('Falló el login con credenciales alternativas');
      }
    } else {
      if (!(await this.isAlreadyLoggedIn(this.pageAlt))) {
        if (!(await this.performLoginAlt(this.pageAlt))) {
          throw new Error('Falló el login con credenciales alternativas');
        }
      } else {
        await this.refreshPageForLatestData(this.pageAlt);
      }
    }

    const excelBtn = 'button[title="Exportar a Excel"]';
    await this.pageAlt!.waitForSelector(excelBtn, { timeout: 20000 });

    const [download] = await Promise.all([
      this.pageAlt!.waitForEvent('download', { timeout: 30000 }),
      this.pageAlt!.click(excelBtn),
    ]);

    excelPath = path.join(
      this.downloadPath,
      `ReporteAlt_${Date.now()}.xlsx`,
    );

    await download.saveAs(excelPath);

    const laravelResponse = await this.sendExcelToLaravel(excelPath);

    return {
      success: true,
      message: 'Excel descargado y enviado a Laravel exitosamente (usando credenciales alternativas)',
      excelPath,
      laravelResponse,
      timestamp: new Date().toISOString(),
      reusedSession: this.isLoggedInAlt,
    };
  }

  /* ─────────── MAIN CON FILTRO FECHA (CAJALIVE) ─────────── */

  async downloadExcelWithDateFilter(fecha: string) {
    let excelPath = '';

    if (!this.browserAlt || !this.pageAlt) {
      const init = await this.initializeBrowser();
      this.browserAlt = init.browser;
      this.pageAlt = init.page;

      if (!(await this.performLoginAlt(this.pageAlt))) {
        throw new Error('Falló el login con credenciales alternativas');
      }
    } else {
      if (!(await this.isAlreadyLoggedIn(this.pageAlt))) {
        if (!(await this.performLoginAlt(this.pageAlt))) {
          throw new Error('Falló el login con credenciales alternativas');
        }
      } else {
        await this.refreshPageForLatestData(this.pageAlt);
      }
    }

    // Aplicar filtro de fecha antes de descargar
    await this.filterByDate(this.pageAlt!, fecha);

    const excelBtn = 'button[title="Exportar a Excel"]';
    await this.pageAlt!.waitForSelector(excelBtn, { timeout: 20000 });

    const [download] = await Promise.all([
      this.pageAlt!.waitForEvent('download', { timeout: 30000 }),
      this.pageAlt!.click(excelBtn),
    ]);

    excelPath = path.join(
      this.downloadPath,
      `ReporteFilter_${Date.now()}.xlsx`,
    );

    await download.saveAs(excelPath);

    const laravelResponse = await this.sendExcelToLaravel(excelPath);

    return {
      success: true,
      message: 'Excel descargado con filtro de fecha y enviado a Laravel exitosamente',
      excelPath,
      fechaFiltro: fecha,
      laravelResponse,
      timestamp: new Date().toISOString(),
      reusedSession: this.isLoggedInAlt,
    };
  }

  /* ─────────── FILTRO FECHA ─────────── */

  private async filterByDate(page: Page, fecha: string): Promise<boolean> {
    try {
      // Esperar a que el input de fecha esté disponible
      await page.waitForSelector('#startDate1', { timeout: 10000 });
      
      // Establecer el valor directamente usando JavaScript
      await page.evaluate((fechaValue) => {
        const input = document.getElementById('startDate1') as HTMLInputElement;
        if (input) {
          input.value = fechaValue;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, fecha);
      
      await this.randomDelay(200, 400);
      
      // Hacer click en el botón "Actualizar Reporte"
      await page.click('#fondoreportes');
      
      // Esperar a que la página se actualice
      await this.randomDelay(1000, 1500);
      
      return true;
    } catch (error) {
      console.error('❌ [DATE] Error al filtrar por fecha:', error.message);
      return false;
    }
  }

  /* ─────────── API PÚBLICA ─────────── */

  setLaravelApiUrl(url: string) {
    this.laravelApiUrl = url;
  }

  getLaravelApiUrl() {
    return this.laravelApiUrl;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }

    if (this.browserAlt) {
      await this.browserAlt.close();
      this.browserAlt = null;
      this.pageAlt = null;
      this.isLoggedInAlt = false;
    }
  }

  getSessionStatus() {
    return {
      browserActive: this.browser !== null,
      pageActive: this.page !== null,
      isLoggedIn: this.isLoggedIn,
      currentPageUrl: this.currentPageUrl,
      browserAltActive: this.browserAlt !== null,
      pageAltActive: this.pageAlt !== null,
      isLoggedInAlt: this.isLoggedInAlt,
      currentPageUrlAlt: this.currentPageUrlAlt,
    };
  }
}
