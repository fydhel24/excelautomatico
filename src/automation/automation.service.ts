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
    'https://importadoramiranda.com/api/movimientos/importar-desde-nestjs  ';

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
    console.log(`⏳ [DELAY] ${delay} ms`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async typeWithDelay(page: Page, selector: string, text: string) {
    console.log(`⌨️ [TYPE] Escribiendo en ${selector}`);
    await page.fill(selector, '');
    for (const char of text) {
      await page.keyboard.type(char);
      await this.randomDelay(30, 70);
    }
  }

  private async simulateHumanBehavior(page: Page) {
    console.log('🧠 [HUMAN] Simulando comportamiento humano...');
    await this.randomDelay(300, 600);

    try {
      await page.evaluate(() => window.scrollTo(0, 150));
      await this.randomDelay(200, 400);
      await page.evaluate(() => window.scrollTo(0, 0));
      console.log('🧠 [HUMAN] Scroll simulado');
    } catch {
      console.log('⚠️ [HUMAN] Scroll omitido');
    }
  }

  /* ─────────── CHECK LOGIN ─────────── */

  private async isAlreadyLoggedIn(page: Page): Promise<boolean> {
    console.log('🔍 [CHECK] Verificando si sesión está activa...');
    try {
      const logged =
        (await page.$('button[title="Exportar a Excel"]')) !== null;

      console.log(
        logged
          ? '✅ [CHECK] Sesión activa detectada'
          : '❌ [CHECK] Sesión NO activa',
      );

      return logged;
    } catch {
      console.log('⚠️ [CHECK] Error verificando login');
      return false;
    }
  }

  /* ─────────── INIT BROWSER ─────────── */

  private async initializeBrowser(): Promise<{ browser: Browser; page: Page }> {
    console.log('🚀 [BROWSER] Iniciando Chromium (headless)...');

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

    console.log('🧩 [BROWSER] Creando contexto...');
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

    console.log('✅ [BROWSER] Navegador listo');
    return { browser, page };
  }

  /* ─────────── LOGIN PRINCIPAL ─────────── */

  private async performLogin(page: Page): Promise<boolean> {
    console.log('🔐 [LOGIN] Iniciando proceso de login (credenciales principales)...');

    try {
      await page.goto(
        'https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index  ',
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      console.log('🌐 [LOGIN] Página de login cargada');

      await this.simulateHumanBehavior(page);

      // Credenciales principales
      await this.typeWithDelay(page, '#authname', 'CajaUno11929');
      await this.randomDelay(150, 300);
      await this.typeWithDelay(page, '#authpass', '6ipzQ-5kOQ');

      console.log('🖱️ [LOGIN] Enviando formulario...');

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        }),
        page.click('#authbtn'),
      ]);

      this.isLoggedIn = true;
      this.currentPageUrl = page.url();

      console.log('✅ [LOGIN] Login exitoso');
      console.log(`📍 [LOGIN] URL actual: ${this.currentPageUrl}`);

      return true;
    } catch (error) {
      console.error('❌ [LOGIN] Error en login:', error.message);
      return false;
    }
  }

  /* ─────────── LOGIN ALTERNATIVO ─────────── */

  private async performLoginAlt(page: Page): Promise<boolean> {
    console.log('🔐 [LOGIN-ALT] Iniciando proceso de login (credenciales alternativas)...');

    try {
      await page.goto(
        'https://apppro.bcp.com.bo/Multiplica/AuthIAM/Index  ',
        { waitUntil: 'domcontentloaded', timeout: 30000 },
      );

      console.log('🌐 [LOGIN-ALT] Página de login cargada');

      await this.simulateHumanBehavior(page);

      // Credenciales alternativas - REEMPLAZA ESTOS VALORES CON LAS CREDENCIALES REALES
      await this.typeWithDelay(page, '#authname', 'CajaLive114559');
      await this.randomDelay(150, 300);
      await this.typeWithDelay(page, '#authpass', 'hXDfP-cj2w');

      console.log('🖱️ [LOGIN-ALT] Enviando formulario...');

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        }),
        page.click('#authbtn'),
      ]);

      this.isLoggedInAlt = true;
      this.currentPageUrlAlt = page.url();

      console.log('✅ [LOGIN-ALT] Login exitoso');
      console.log(`📍 [LOGIN-ALT] URL actual: ${this.currentPageUrlAlt}`);

      return true;
    } catch (error) {
      console.error('❌ [LOGIN-ALT] Error en login:', error.message);
      return false;
    }
  }

  /* ─────────── REFRESH ─────────── */

  private async refreshPageForLatestData(page: Page) {
    console.log('🔄 [REFRESH] Recargando página...');
    await page.reload({
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await this.randomDelay(600, 900);
    console.log('✅ [REFRESH] Página actualizada');
  }

  /* ─────────── MAIN PRINCIPAL ─────────── */

  async downloadExcelAndSendToLaravel() {
    console.log('▶️ [START] Proceso iniciado (credenciales principales)');

    let excelPath = '';

    if (!this.browser || !this.page) {
      console.log('🆕 [SESSION] Nueva sesión principal');
      const init = await this.initializeBrowser();
      this.browser = init.browser;
      this.page = init.page;

      if (!(await this.performLogin(this.page))) {
        throw new Error('Falló el login con credenciales principales');
      }
    } else {
      console.log('♻️ [SESSION] Reutilizando sesión principal');

      if (!(await this.isAlreadyLoggedIn(this.page))) {
        console.log('🔑 [SESSION] Sesión expirada, relogin');
        if (!(await this.performLogin(this.page))) {
          throw new Error('Falló el login con credenciales principales');
        }
      } else {
        await this.refreshPageForLatestData(this.page);
      }
    }

    console.log('📊 [EXCEL] Buscando botón Exportar...');
    const excelBtn = 'button[title="Exportar a Excel"]';
    await this.page!.waitForSelector(excelBtn, { timeout: 20000 });

    console.log('⬇️ [EXCEL] Descargando archivo...');
    const [download] = await Promise.all([
      this.page!.waitForEvent('download', { timeout: 30000 }),
      this.page!.click(excelBtn),
    ]);

    excelPath = path.join(
      this.downloadPath,
      `Reporte_${Date.now()}.xlsx`,
    );

    await download.saveAs(excelPath);
    console.log(`✅ [EXCEL] Guardado en ${excelPath}`);

    console.log('📤 [LARAVEL] Enviando archivo...');
    const laravelResponse = await this.sendExcelToLaravel(excelPath);

    console.log('🏁 [END] Proceso completado (credenciales principales)');

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
    console.log('▶️ [START] Proceso iniciado (credenciales alternativas)');

    let excelPath = '';

    if (!this.browserAlt || !this.pageAlt) {
      console.log('🆕 [SESSION-ALT] Nueva sesión alternativa');
      const init = await this.initializeBrowser();
      this.browserAlt = init.browser;
      this.pageAlt = init.page;

      if (!(await this.performLoginAlt(this.pageAlt))) {
        throw new Error('Falló el login con credenciales alternativas');
      }
    } else {
      console.log('♻️ [SESSION-ALT] Reutilizando sesión alternativa');

      if (!(await this.isAlreadyLoggedIn(this.pageAlt))) {
        console.log('🔑 [SESSION-ALT] Sesión expirada, relogin');
        if (!(await this.performLoginAlt(this.pageAlt))) {
          throw new Error('Falló el login con credenciales alternativas');
        }
      } else {
        await this.refreshPageForLatestData(this.pageAlt);
      }
    }

    console.log('📊 [EXCEL-ALT] Buscando botón Exportar...');
    const excelBtn = 'button[title="Exportar a Excel"]';
    await this.pageAlt!.waitForSelector(excelBtn, { timeout: 20000 });

    console.log('⬇️ [EXCEL-ALT] Descargando archivo...');
    const [download] = await Promise.all([
      this.pageAlt!.waitForEvent('download', { timeout: 30000 }),
      this.pageAlt!.click(excelBtn),
    ]);

    excelPath = path.join(
      this.downloadPath,
      `ReporteAlt_${Date.now()}.xlsx`,
    );

    await download.saveAs(excelPath);
    console.log(`✅ [EXCEL-ALT] Guardado en ${excelPath}`);

    console.log('📤 [LARAVEL-ALT] Enviando archivo...');
    const laravelResponse = await this.sendExcelToLaravel(excelPath);

    console.log('🏁 [END] Proceso completado (credenciales alternativas)');

    return {
      success: true,
      message: 'Excel descargado y enviado a Laravel exitosamente (usando credenciales alternativas)',
      excelPath,
      laravelResponse,
      timestamp: new Date().toISOString(),
      reusedSession: this.isLoggedInAlt,
    };
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

    console.log('✅ [LARAVEL] Archivo enviado correctamente');
    return response.data;
  }

  /* ─────────── API PÚBLICA ─────────── */

  setLaravelApiUrl(url: string) {
    console.log(`🔧 [CONFIG] Laravel URL actualizada: ${url}`);
    this.laravelApiUrl = url;
  }

  getLaravelApiUrl() {
    return this.laravelApiUrl;
  }

  async closeBrowser() {
    if (this.browser) {
      console.log('👋 [BROWSER] Cerrando navegador principal');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isLoggedIn = false;
    }

    if (this.browserAlt) {
      console.log('👋 [BROWSER-ALT] Cerrando navegador alternativo');
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