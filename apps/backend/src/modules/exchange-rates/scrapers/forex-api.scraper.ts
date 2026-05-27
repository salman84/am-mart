import { Logger } from '@nestjs/common';
import axios from 'axios';

const logger = new Logger('ForexApiScraper');

export interface RateResult {
  sendCurrency: string;
  recvCurrency: string;
  rate: number;
  rateSource: string;
}

/**
 * Fetches live rates from fawazahmed0/currency-api (CDN, free, multi-source aggregator).
 * Primary: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.min.json
 * Fallback: https://latest.currency-api.pages.dev/v1/currencies/{base}.min.json
 * Fallback2: https://open.er-api.com/v6/latest/{base}
 */
export async function fetchForexApiRates(
  sendCurrencies: string[],
  recvCurrencies: string[],
): Promise<RateResult[]> {
  const results: RateResult[] = [];
  const uniqueSenders = [...new Set(sendCurrencies)];

  for (const base of uniqueSenders) {
    const baseLower = base.toLowerCase();
    let ratesMap: Record<string, number> | null = null;
    let source = 'forex_api';

    // Primary: fawazahmed0 CDN
    try {
      const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseLower}.min.json`;
      const { data } = await axios.get(url, { timeout: 10000 });
      if (data?.[baseLower]) {
        ratesMap = data[baseLower];
        source = 'live_market';
      }
    } catch {}

    // Fallback 1: currency-api pages.dev
    if (!ratesMap) {
      try {
        const url = `https://latest.currency-api.pages.dev/v1/currencies/${baseLower}.min.json`;
        const { data } = await axios.get(url, { timeout: 10000 });
        if (data?.[baseLower]) {
          ratesMap = data[baseLower];
          source = 'live_market';
        }
      } catch {}
    }

    // Fallback 2: open.er-api.com
    if (!ratesMap) {
      try {
        const url = `https://open.er-api.com/v6/latest/${base}`;
        const { data } = await axios.get(url, { timeout: 10000 });
        if (data?.result === 'success' && data?.rates) {
          // convert keys to lowercase for uniform access
          ratesMap = {};
          for (const [k, v] of Object.entries(data.rates)) {
            ratesMap[k.toLowerCase()] = v as number;
          }
          source = 'forex_api';
        }
      } catch (err: any) {
        logger.warn(`ForexApiScraper all sources failed for ${base}: ${err.message}`);
      }
    }

    if (!ratesMap) continue;

    for (const recv of recvCurrencies) {
      if (recv === base) continue;
      const rate = ratesMap[recv.toLowerCase()];
      if (rate && typeof rate === 'number' && rate > 0) {
        results.push({ sendCurrency: base, recvCurrency: recv, rate, rateSource: source });
      }
    }
  }

  return results;
}
