import { Logger } from '@nestjs/common';
import axios from 'axios';
import { RateResult } from './forex-api.scraper';

const logger = new Logger('WiseScraper');

/**
 * Fetches live mid-market rates from Wise public API.
 * Endpoint: https://api.wise.com/v1/rates?source=KRW&target=PHP
 * No auth required for public rates (mid-market only).
 */
export async function fetchWiseRates(
  sendCurrencies: string[],
  recvCurrencies: string[],
): Promise<RateResult[]> {
  const results: RateResult[] = [];
  const pairs: Array<[string, string]> = [];

  for (const send of sendCurrencies) {
    for (const recv of recvCurrencies) {
      if (send !== recv) pairs.push([send, recv]);
    }
  }

  // Wise public rate endpoint
  for (const [send, recv] of pairs) {
    try {
      const url = `https://api.wise.com/v1/rates?source=${send}&target=${recv}`;
      const { data } = await axios.get(url, { timeout: 10000 });
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        if (entry?.rate) {
          results.push({
            sendCurrency: send,
            recvCurrency: recv,
            rate: entry.rate,
            rateSource: 'wise_api',
          });
        }
      }
    } catch (err: any) {
      // Try fallback: wise.com/rates/live page via HTML
      try {
        const { data: html } = await axios.get(
          `https://wise.com/gb/currency-converter/${send.toLowerCase()}-to-${recv.toLowerCase()}-rate`,
          { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AMmartBot/1.0)' } },
        );
        // Parse rate from JSON-LD or meta
        const match = html?.match(/"price"\s*:\s*"?([\d.]+)"?/);
        if (match?.[1]) {
          results.push({
            sendCurrency: send,
            recvCurrency: recv,
            rate: parseFloat(match[1]),
            rateSource: 'wise_html',
          });
        }
      } catch {
        logger.warn(`WiseScraper failed for ${send}→${recv}: ${err.message}`);
      }
    }
  }

  return results;
}
