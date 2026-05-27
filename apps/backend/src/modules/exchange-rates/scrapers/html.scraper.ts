import { Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { RateResult } from './forex-api.scraper';

const logger = new Logger('HtmlScraper');

/**
 * Generic HTML scraper using cheerio.
 * Tries multiple extraction strategies in order.
 */
export async function fetchHtmlRates(
  sourceUrl: string,
  sendCurrencies: string[],
  recvCurrencies: string[],
): Promise<RateResult[]> {
  const results: RateResult[] = [];

  try {
    const { data: html } = await axios.get(sourceUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      },
    });

    const $ = cheerio.load(html);

    // Strategy 1: Look for JSON-LD structured data
    const jsonLd = $('script[type="application/ld+json"]').text();
    if (jsonLd) {
      try {
        const parsed = JSON.parse(jsonLd);
        if (parsed?.offers || parsed?.exchangeRate) {
          const rate = parsed?.exchangeRate?.price || parsed?.offers?.price;
          if (rate) {
            const send = sendCurrencies[0] || 'KRW';
            const recv = recvCurrencies[0] || 'USD';
            results.push({ sendCurrency: send, recvCurrency: recv, rate: parseFloat(rate), rateSource: 'html_jsonld' });
            return results;
          }
        }
      } catch {}
    }

    // Strategy 2: Look for common rate table patterns
    const ratePatterns = [
      // table with currency + rate cells
      { selector: 'table tr', currencyAttr: null },
    ];

    $('table tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const cell1 = cells.eq(0).text().trim().toUpperCase();
        const cell2 = cells.eq(1).text().trim().replace(/,/g, '');
        const rateVal = parseFloat(cell2);
        if (!isNaN(rateVal) && rateVal > 0) {
          for (const send of sendCurrencies) {
            for (const recv of recvCurrencies) {
              if (cell1.includes(recv) || cell1.includes(send)) {
                results.push({ sendCurrency: send, recvCurrency: recv, rate: rateVal, rateSource: 'html_table' });
              }
            }
          }
        }
      }
    });

    if (results.length > 0) return results;

    // Strategy 3: Look for rate numbers near currency codes in text
    const bodyText = $('body').text();
    for (const send of sendCurrencies) {
      for (const recv of recvCurrencies) {
        if (send === recv) continue;
        // Look for patterns like "PHP 38.50" or "38.50 PHP" or "1 KRW = 0.038 PHP"
        const patterns = [
          new RegExp(`1\\s*${send}\\s*[=:→]\\s*([\\d.]+)\\s*${recv}`, 'i'),
          new RegExp(`${recv}\\s*[=:]?\\s*([\\d,]+\\.\\d+)`, 'i'),
          new RegExp(`([\\d,]+\\.\\d+)\\s*${recv}`, 'i'),
        ];
        for (const pattern of patterns) {
          const match = bodyText.match(pattern);
          if (match?.[1]) {
            const rate = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(rate) && rate > 0 && rate < 1_000_000) {
              results.push({ sendCurrency: send, recvCurrency: recv, rate, rateSource: 'html_text' });
              break;
            }
          }
        }
      }
    }

    // Strategy 4: Look for meta tags with exchange data
    if (results.length === 0) {
      const metaRate = $('meta[name="exchange-rate"], meta[property="og:price:amount"]').attr('content');
      if (metaRate) {
        const rate = parseFloat(metaRate);
        if (!isNaN(rate) && rate > 0) {
          results.push({
            sendCurrency: sendCurrencies[0] || 'KRW',
            recvCurrency: recvCurrencies[0] || 'USD',
            rate,
            rateSource: 'html_meta',
          });
        }
      }
    }
  } catch (err: any) {
    logger.warn(`HtmlScraper failed for ${sourceUrl}: ${err.message}`);
  }

  return results;
}
