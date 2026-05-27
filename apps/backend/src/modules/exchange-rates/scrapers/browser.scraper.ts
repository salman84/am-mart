/**
 * browser.scraper.ts
 *
 * Unified "live rate" scraper for Korean remittance companies.
 *
 * Companies with directly-accessible APIs (no browser launch needed):
 *   • GME Remit  — POST https://www.gmeremit.com/api/exchange-rate
 *
 * Companies that require headless Chrome (JS SPA):
 *   • Sentbe     — captures fx.service.sentbe.com/v1/global_rates via browser
 *   • Hanpass, JRF, Hibiki, Narabi — generic DOM/API-intercept strategy
 *
 * Providers still using FOREX_API+spread model (companies without accessible rate APIs):
 *   • E9Pay, 365pay, CoinoneTransfer, etc.
 */

import { chromium, Browser, BrowserContext } from 'playwright-core';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { RateResult } from './forex-api.scraper';

const logger = new Logger('BrowserScraper');

// ─── Chrome Path Detection ────────────────────────────────────────────────────

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function findChromePath(): string {
  const envPath = process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH env var.');
}

// ─── Rate Validation ──────────────────────────────────────────────────────────

const RATE_RANGES: Record<string, Record<string, [number, number]>> = {
  KRW: {
    PHP: [0.028, 0.060],
    USD: [0.00050, 0.00110],
    EUR: [0.00045, 0.00095],
    GBP: [0.00038, 0.00085],
    JPY: [0.070, 0.130],
    CNY: [0.0035, 0.0090],
    VND: [10, 26],
    BDT: [0.055, 0.130],
    MYR: [0.0018, 0.0060],
    THB: [0.018, 0.045],
    IDR: [8, 20],
    SGD: [0.00065, 0.00150],
    HKD: [0.0045, 0.0090],
    TWD: [0.020, 0.040],
    AUD: [0.00065, 0.00135],
    CAD: [0.00065, 0.00130],
    NZD: [0.00055, 0.00120],
    KHR: [1.5, 6],
    LAK: [8, 28],
    MMK: [1.0, 4.0],
    NPR: [0.075, 0.160],
    PKR: [0.14, 0.35],
    LKR: [0.22, 0.55],
    UZS: [7, 14],
    MNT: [1.2, 4.5],
    INR: [0.040, 0.100],
    NGN: [0.50, 2.50],
  },
};

function isValidRate(send: string, recv: string, rate: number): boolean {
  const range = RATE_RANGES[send]?.[recv];
  if (!range) return rate > 0 && rate < 1_000_000;
  return rate >= range[0] && rate <= range[1];
}

// ─── GME Remit — Direct API (no browser needed) ──────────────────────────────

/**
 * Currency → Country name mapping for the GME Remit API.
 * GME's API uses the destination country name as a parameter.
 */
const GME_CURRENCY_COUNTRY: Record<string, string> = {
  PHP: 'Philippines',
  USD: 'United States',
  EUR: 'Germany',
  GBP: 'United Kingdom',
  JPY: 'Japan',
  CNY: 'China',
  VND: 'Vietnam',
  BDT: 'Bangladesh',
  MYR: 'Malaysia',
  THB: 'Thailand',
  IDR: 'Indonesia',
  SGD: 'Singapore',
  HKD: 'Hong Kong',
  TWD: 'Taiwan',
  AUD: 'Australia',
  CAD: 'Canada',
  NZD: 'New Zealand',
  NPR: 'Nepal',
  PKR: 'Pakistan',
  LKR: 'Sri Lanka',
  MNT: 'Mongolia',
  UZS: 'Uzbekistan',
  KHR: 'Cambodia',
  MMK: 'Myanmar',
  INR: 'India',
  LAK: 'Laos',
  NGN: 'Nigeria',
};

async function fetchGMERemitRates(
  sendCurrencies: string[],
  recvCurrencies: string[],
): Promise<RateResult[]> {
  const results: RateResult[] = [];

  for (const send of sendCurrencies) {
    if (send !== 'KRW') {
      logger.warn(`GME Remit: only KRW send currency supported (got ${send})`);
      continue;
    }

    for (const recv of recvCurrencies) {
      if (recv === send) continue;
      const country = GME_CURRENCY_COUNTRY[recv];
      if (!country) {
        logger.warn(`GME Remit: no country mapping for ${recv}`);
        continue;
      }

      try {
        const { data } = await axios.post(
          'https://www.gmeremit.com/api/exchange-rate',
          {
            pCurr: recv,
            pCountryName: country,
            cAmt: '1000000',
            pAmt: '',
            deliveryMethod: '1',
            calBy: 'C',
          },
          {
            headers: {
              Referer: 'https://www.gmeremit.com/',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
            },
            timeout: 12000,
          },
        );

        if (data?.errorCode === '0' && data?.exRate) {
          const rate = parseFloat(data.exRate);
          if (!isNaN(rate) && isValidRate(send, recv, rate)) {
            results.push({ sendCurrency: send, recvCurrency: recv, rate, rateSource: 'gme_api' });
            logger.log(`GME Remit ${send}→${recv}: ${rate}`);
          }
        }
      } catch (err: any) {
        logger.warn(`GME Remit API failed for ${send}→${recv}: ${err.message}`);
      }

      // Small delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return results;
}

// ─── Sentbe — Browser (captures fx.service.sentbe.com/v1/global_rates) ───────

async function fetchSentbeRates(
  browser: Browser,
  sendCurrencies: string[],
  recvCurrencies: string[],
): Promise<RateResult[]> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  });

  let globalRates: Record<string, unknown> | null = null;

  const page = await context.newPage();

  // Specifically wait for the Sentbe global rates API response
  page.on('response', async (resp) => {
    if (resp.url().includes('fx.service.sentbe.com') && resp.url().includes('global_rates')) {
      try {
        globalRates = await resp.json();
        logger.log(`Sentbe: captured ${Object.keys(globalRates ?? {}).length} rate pairs from global_rates API`);
      } catch (e) { /* ignore */ }
    }
  });

  try {
    await page.goto('https://www.sentbe.com/ko/send', {
      waitUntil: 'load',
      timeout: 30000,
    });
    // Give extra time for the rates API call to complete
    await page.waitForTimeout(5000);
  } catch (err: any) {
    logger.warn(`Sentbe: navigation error — ${err.message}`);
  }

  await page.close().catch(() => undefined);
  await context.close().catch(() => undefined);

  if (!globalRates) {
    logger.warn('Sentbe: global_rates API response not captured');
    return [];
  }

  const results: RateResult[] = [];

  for (const send of sendCurrencies) {
    for (const recv of recvCurrencies) {
      if (send === recv) continue;

      // API values may be numbers OR numeric strings — always use toFloat()

      // Strategy 1: direct key krw_usd, krw_vnd, etc.
      const directKey = `${send.toLowerCase()}_${recv.toLowerCase()}`;
      const directRate = toFloat(globalRates[directKey]);
      if (!isNaN(directRate) && isValidRate(send, recv, directRate)) {
        results.push({ sendCurrency: send, recvCurrency: recv, rate: directRate, rateSource: 'sentbe_api' });
        continue;
      }

      // Strategy 2: inverse key php_krw → 1/value gives krw_php
      const inverseKey = `${recv.toLowerCase()}_${send.toLowerCase()}`;
      const inverseRate = toFloat(globalRates[inverseKey]);
      if (!isNaN(inverseRate) && inverseRate > 0) {
        const rate = 1 / inverseRate;
        if (isValidRate(send, recv, rate)) {
          results.push({ sendCurrency: send, recvCurrency: recv, rate, rateSource: 'sentbe_api_inv' });
          continue;
        }
      }

      // Strategy 3: mid-market variant
      const midKey = `${send.toLowerCase()}_${recv.toLowerCase()}_mid`;
      const midRate = toFloat(globalRates[midKey]);
      if (!isNaN(midRate) && isValidRate(send, recv, midRate)) {
        results.push({ sendCurrency: send, recvCurrency: recv, rate: midRate, rateSource: 'sentbe_mid' });
      }
    }
  }

  logger.log(`Sentbe: extracted ${results.length} rates`);
  return results;
}

// ─── Generic Browser Scraper ─────────────────────────────────────────────────

const RATE_FIELD_NAMES = [
  'rate', 'exchangeRate', 'exchange_rate', 'toRate', 'sendRate',
  'remittanceRate', 'tradeRate', 'baseRate', 'conversionRate', 'rateAmount',
  'buyRate', 'sellRate', 'transferRate', 'fxRate', 'price',
  '환율', 'remit_rate', 'calc_rate', 'exRate', 'ex_rate',
];

function deepSearchRate(obj: unknown, send: string, recv: string, depth = 0): number | null {
  if (depth > 12 || obj === null || obj === undefined) return null;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    const objStr = JSON.stringify(rec).toUpperCase();
    if (objStr.includes(recv) || objStr.includes(send)) {
      for (const field of RATE_FIELD_NAMES) {
        const val = rec[field];
        if (typeof val === 'number' && isValidRate(send, recv, val)) return val;
        if (typeof val === 'string') {
          const num = parseFloat((val as string).replace(/,/g, ''));
          if (!isNaN(num) && isValidRate(send, recv, num)) return num;
        }
      }
    }
    for (const key of Object.keys(rec)) {
      const found = deepSearchRate(rec[key], send, recv, depth + 1);
      if (found !== null) return found;
    }
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = deepSearchRate(item, send, recv, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

async function genericBrowserScrape(
  browser: Browser,
  url: string,
  sendCurrencies: string[],
  recvCurrencies: string[],
  label: string,
): Promise<RateResult[]> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  });
  const results: RateResult[] = [];
  const capturedJson: Array<{ url: string; data: unknown }> = [];

  const page = await context.newPage();
  page.on('response', async (resp) => {
    const ct = resp.headers()['content-type'] ?? '';
    if (!ct.includes('application/json')) return;
    try { capturedJson.push({ url: resp.url(), data: await resp.json() }); } catch { /* ignore */ }
  });

  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(4000);
  } catch (err: any) {
    logger.warn(`[${label}] Navigation failed: ${err.message}`);
  }

  for (const send of sendCurrencies) {
    for (const recv of recvCurrencies) {
      if (send === recv) continue;
      for (const { data } of capturedJson) {
        const rate = deepSearchRate(data, send, recv);
        if (rate !== null) {
          results.push({ sendCurrency: send, recvCurrency: recv, rate, rateSource: `${label}_api` });
          break;
        }
      }
    }
  }

  await page.close().catch(() => undefined);
  await context.close().catch(() => undefined);
  return results;
}

// ─── Company Scraper Registry ────────────────────────────────────────────────

type DirectScraperFn = (send: string[], recv: string[]) => Promise<RateResult[]>;
type BrowserScraperFn = (browser: Browser, send: string[], recv: string[]) => Promise<RateResult[]>;

/** Parse a rate value that may be either a number or a numeric string */
function toFloat(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v.replace(/,/g, ''));
  return NaN;
}

/** Company scrapers that DON'T need a browser (direct API calls) */
const DIRECT_SCRAPERS: Record<string, DirectScraperFn> = {
  'gme-remit': fetchGMERemitRates,
};

/** Company scrapers that DO need a browser */
const BROWSER_SCRAPERS: Record<string, BrowserScraperFn> = {
  'sentbe': fetchSentbeRates,
  'hanpass': (b, s, r) => genericBrowserScrape(b, 'https://www.hanpass.com', s, r, 'hanpass'),
  'jrf':     (b, s, r) => genericBrowserScrape(b, 'https://www.jrf.co.kr', s, r, 'jrf'),
  'e9pay':   (b, s, r) => genericBrowserScrape(b, 'https://www.e9pay.co.kr', s, r, 'e9pay'),
  'hibiki':  (b, s, r) => genericBrowserScrape(b, 'https://www.hibiki.co.kr', s, r, 'hibiki'),
  'narabi':  (b, s, r) => genericBrowserScrape(b, 'https://www.narabi.co.kr', s, r, 'narabi'),
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main entry point for the BROWSER_SCRAPER fetch method.
 * Routes to direct API or headless browser based on company slug.
 */
export async function fetchBrowserRates(
  scraperKey: string,
  sendCurrencies: string[],
  recvCurrencies: string[],
): Promise<RateResult[]> {
  // ── Direct API (no browser launch needed) ───────────────────────────────────
  const directFn = DIRECT_SCRAPERS[scraperKey];
  if (directFn) {
    logger.log(`⚡ Direct API scrape for "${scraperKey}"`);
    try {
      const results = await directFn(sendCurrencies, recvCurrencies);
      logger.log(`✅ Direct API "${scraperKey}": ${results.length} rates`);
      return results;
    } catch (err: any) {
      logger.error(`❌ Direct API "${scraperKey}" failed: ${err.message}`);
      return [];
    }
  }

  // ── Headless browser ────────────────────────────────────────────────────────
  const browserFn = BROWSER_SCRAPERS[scraperKey];
  if (!browserFn) {
    logger.warn(`BrowserScraper: no scraper for key "${scraperKey}"`);
    return [];
  }

  const executablePath = findChromePath();
  logger.log(`🌐 Launching Chrome for "${scraperKey}"`);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--window-size=1280,800',
      ],
    });

    const results = await browserFn(browser, sendCurrencies, recvCurrencies);
    logger.log(`✅ Browser "${scraperKey}": ${results.length} rates`);
    return results;
  } catch (err: any) {
    logger.error(`❌ Browser "${scraperKey}" failed: ${err.message}`);
    return [];
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
