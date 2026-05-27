import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProviderDto, UpdateProviderDto, ManualRateDto } from './dto/provider.dto';
import { PRESET_COMPANIES, SUPPORTED_CURRENCIES } from './companies.data';
import { fetchForexApiRates } from './scrapers/forex-api.scraper';
import { fetchWiseRates } from './scrapers/wise.scraper';
import { fetchHtmlRates } from './scrapers/html.scraper';
import { fetchBrowserRates } from './scrapers/browser.scraper';

/**
 * Known typical rate spreads for remittance companies.
 * Spread = how much less than the mid-market rate the customer receives.
 * e.g. 0.8% spread: customer gets 99.2% of mid-market.
 * Source: publicly observed rates from each company's app/website.
 */
const AUTO_SPREADS: Record<string, number> = {
  // Korea-based (competitive fintech)
  'sentbe':          0.8,
  'gme-remit':       1.3,
  'e9pay':           1.4,
  'hanpass':         1.2,
  'jrf':             1.8,
  'hibiki':          1.5,
  'narabi':          1.8,
  'coinone-transfer':1.0,
  '365pay':          2.0,
  'moneytree-korea': 2.0,
  // Korea banks (higher spread than fintech)
  'keb-hana':        2.5,
  'woori-won':       2.5,
  'kb-kookmin':      2.5,
  'shinhan-bank':    2.5,
  'ibk-bank':        2.5,
  'nh-bank':         2.5,
  'kakaobank':       1.5,
  'toss':            1.5,
  // Global fintech
  'wise':            0.5,
  'remitly':         2.0,
  'worldremit':      2.5,
  'ria':             2.5,
  'paysend':         2.0,
  'instarem':        1.5,
  'ofx':             1.5,
  'revolut':         1.0,
  'xoom':            3.0,
  'transfergo':      1.8,
  // Traditional (high spread)
  'western-union':   3.5,
  'moneygram':       3.5,
  'skrill':          3.0,
};

/** Returns the automatic spread % for a provider. MANUAL providers always get 0. */
function getAutoSpread(slug: string, fetchMethod: string): number {
  if (fetchMethod === 'MANUAL') return 0;
  return AUTO_SPREADS[slug] ?? 1.0; // default 1% for unknown auto-fetch companies
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Providers CRUD ──────────────────────────────────────────────────────────

  async getAllProviders(includeInactive = false) {
    return this.prisma.exchangeRateProvider.findMany({
      where: includeInactive ? {} : { status: 'ACTIVE' },
      include: {
        rates: { orderBy: { lastUpdated: 'desc' } },
      },
      orderBy: [{ isFeatured: 'desc' }, { priority: 'asc' }, { companyName: 'asc' }],
    });
  }

  async getProvider(id: string) {
    const p = await this.prisma.exchangeRateProvider.findUnique({
      where: { id },
      include: {
        rates: { orderBy: { lastUpdated: 'desc' } },
        updateLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!p) throw new NotFoundException('Provider not found');
    return p;
  }

  async createProvider(dto: CreateProviderDto) {
    const spreadPercent = getAutoSpread(dto.slug, dto.fetchMethod ?? 'MANUAL');
    const provider = await this.prisma.exchangeRateProvider.create({
      data: { ...dto, rateSpreadPercent: spreadPercent } as any,
    });
    this.logger.log(`Created ${provider.companyName} — auto spread: ${spreadPercent}%`);
    // Auto-fetch rates immediately for non-manual providers so they show right away
    if (provider.fetchMethod !== 'MANUAL' && (provider.supportedRecvCurrencies?.length ?? 0) > 0) {
      this.fetchProviderRates(provider.id).catch((err) =>
        this.logger.warn(`Auto-fetch on create failed for ${provider.companyName}: ${err.message}`),
      );
    }
    return provider;
  }

  async updateProvider(id: string, dto: UpdateProviderDto) {
    await this.getProvider(id);
    const spreadPercent = getAutoSpread(dto.slug ?? '', dto.fetchMethod ?? 'MANUAL');
    const provider = await this.prisma.exchangeRateProvider.update({
      where: { id },
      data: { ...dto, rateSpreadPercent: spreadPercent } as any,
    });
    // Re-fetch if fetch method or supported currencies changed and it's not manual
    if (provider.fetchMethod !== 'MANUAL' && (provider.supportedRecvCurrencies?.length ?? 0) > 0) {
      this.fetchProviderRates(provider.id).catch((err) =>
        this.logger.warn(`Auto-fetch on update failed for ${provider.companyName}: ${err.message}`),
      );
    }
    return provider;
  }

  async deleteProvider(id: string) {
    await this.getProvider(id);
    return this.prisma.exchangeRateProvider.delete({ where: { id } });
  }

  // ─── Manual Rate Entry ────────────────────────────────────────────────────────

  async setManualRate(providerId: string, dto: ManualRateDto) {
    await this.getProvider(providerId);
    const existing = await this.prisma.exchangeRate.findUnique({
      where: {
        providerId_sendCurrency_recvCurrency: {
          providerId,
          sendCurrency: dto.sendCurrency,
          recvCurrency: dto.recvCurrency,
        },
      },
    });

    const data = {
      rate: dto.rate,
      transferFee: dto.transferFee ?? 0,
      isStale: false,
      rateSource: 'manual',
      lastUpdated: new Date(),
    };

    if (existing) {
      return this.prisma.exchangeRate.update({ where: { id: existing.id }, data });
    }

    return this.prisma.exchangeRate.create({
      data: {
        providerId,
        sendCurrency: dto.sendCurrency,
        recvCurrency: dto.recvCurrency,
        ...data,
      },
    });
  }

  // ─── Live Rate Comparison ─────────────────────────────────────────────────────

  async compareRates(sendCurrency: string, recvCurrency: string, amount?: number) {
    const rates = await this.prisma.exchangeRate.findMany({
      where: { sendCurrency, recvCurrency, isStale: false },
      include: {
        provider: {
          select: {
            id: true,
            companyName: true,
            slug: true,
            logoUrl: true,
            officialWebsite: true,
            appDeepLink: true,
            transferTime: true,
            isVerified: true,
            isFeatured: true,
            status: true,
          },
        },
      },
      orderBy: { rate: 'desc' },
    });

    let results = rates
      .filter((r) => r.provider.status === 'ACTIVE')
      .map((r) => ({
        ...r,
        receivedAmount: amount ? amount * r.rate - r.transferFee : undefined,
      }));

    // ── Fallback: if no stored rates, try reverse pair then live ForexAPI ──────
    if (results.length === 0) {
      // 1) Try reverse pair (e.g. PHP→KRW stored → invert to get KRW→PHP)
      const reverseRates = await this.prisma.exchangeRate.findMany({
        where: { sendCurrency: recvCurrency, recvCurrency: sendCurrency, isStale: false },
        include: {
          provider: {
            select: {
              id: true, companyName: true, slug: true, logoUrl: true,
              officialWebsite: true, appDeepLink: true, transferTime: true,
              isVerified: true, isFeatured: true, status: true,
            },
          },
        },
        orderBy: { rate: 'desc' },
      });

      if (reverseRates.length > 0) {
        results = reverseRates
          .filter((r) => r.provider.status === 'ACTIVE')
          .map((r) => {
            const invertedRate = r.rate > 0 ? 1 / r.rate : 0;
            return {
              ...r,
              sendCurrency,
              recvCurrency,
              rate: invertedRate,
              rateSource: r.rateSource + '_inverted',
              receivedAmount: amount ? amount * invertedRate - r.transferFee : undefined,
            } as any;
          });
      }

      // 2) Live ForexAPI fallback — always works for any pair
      if (results.length === 0) {
        try {
          const liveRates = await fetchForexApiRates([sendCurrency], [recvCurrency]);
          if (liveRates.length > 0) {
            const liveRate = liveRates[0].rate;
            // Use a generic "Live Rate" provider entry
            results = [{
              id: 'live-forex',
              providerId: 'live-forex',
              sendCurrency,
              recvCurrency,
              rate: liveRate,
              transferFee: 0,
              isBestRate: true,
              isStale: false,
              rateSource: 'forex_api_live',
              lastUpdated: new Date(),
              createdAt: new Date(),
              receivedAmount: amount ? amount * liveRate : undefined,
              provider: {
                id: 'live-forex',
                companyName: 'Live Market Rate',
                slug: 'live-forex',
                logoUrl: null,
                officialWebsite: 'https://www.exchangerate-api.com',
                appDeepLink: null,
                transferTime: 'Varies by provider',
                isVerified: true,
                isFeatured: false,
                status: 'ACTIVE',
              },
            } as any];
          }
        } catch (err: any) {
          this.logger.warn(`compareRates fallback failed for ${sendCurrency}→${recvCurrency}: ${err.message}`);
        }
      }
    }

    // Mark best rate
    if (results.length > 0) {
      results[0].isBestRate = true;
    }

    return {
      sendCurrency,
      recvCurrency,
      amount,
      results,
      lastUpdated: results[0]?.lastUpdated ?? null,
      currencies: SUPPORTED_CURRENCIES,
    };
  }

  async getPublicRates(sendCurrency: string, recvCurrency: string, amount?: number) {
    return this.compareRates(sendCurrency, recvCurrency, amount);
  }

  // ─── Auto-Fetch Scheduler ─────────────────────────────────────────────────────

  @Cron('0 */5 * * * *') // every 5 minutes
  async autoFetchAllRates() {
    this.logger.log('🔄 Auto-fetching exchange rates...');
    const providers = await this.prisma.exchangeRateProvider.findMany({
      where: { status: 'ACTIVE', fetchMethod: { not: 'MANUAL' } },
    });

    for (const provider of providers) {
      await this.fetchProviderRates(provider.id);
    }
    this.logger.log(`✅ Auto-fetch complete for ${providers.length} providers`);
  }

  async fetchProviderRates(providerId: string) {
    const provider = await this.prisma.exchangeRateProvider.findUnique({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    const start = Date.now();
    let ratesUpdated = 0;
    let errorMessage: string | undefined;

    try {
      let results: Array<{ sendCurrency: string; recvCurrency: string; rate: number; rateSource: string }> = [];

      if (provider.fetchMethod === 'FOREX_API') {
        results = await fetchForexApiRates(
          provider.supportedSendCurrencies,
          provider.supportedRecvCurrencies,
        );
      } else if (provider.fetchMethod === 'WISE_API') {
        results = await fetchWiseRates(
          provider.supportedSendCurrencies,
          provider.supportedRecvCurrencies,
        );
      } else if (provider.fetchMethod === 'HTML_SCRAPER' && provider.sourceUrl) {
        results = await fetchHtmlRates(
          provider.sourceUrl,
          provider.supportedSendCurrencies,
          provider.supportedRecvCurrencies,
        );
      } else if (provider.fetchMethod === 'BROWSER_SCRAPER') {
        // Use headless Chrome to scrape JavaScript-rendered rate pages.
        // scraperKey identifies which company-specific scraper to run (matches slug).
        const key = provider.scraperKey ?? provider.slug;
        results = await fetchBrowserRates(
          key,
          provider.supportedSendCurrencies,
          provider.supportedRecvCurrencies,
        );
      }

      // BROWSER_SCRAPER returns the actual customer rate from the company's own API —
      // do NOT apply any additional spread (the company's margin is already baked in).
      // FOREX_API/WISE_API return mid-market rates, so we apply the company's typical spread.
      const spreadPercent = provider.fetchMethod === 'BROWSER_SCRAPER'
        ? 0
        : ((provider as any).rateSpreadPercent ?? 0);

      for (const r of results) {
        // A remittance company applies a margin on the mid-market rate.
        // spreadPercent > 0 → customer receives less foreign currency (company margin).
        const adjustedRate = spreadPercent > 0
          ? r.rate * (1 - spreadPercent / 100)
          : r.rate;
        const rateSource = spreadPercent > 0
          ? `${r.rateSource}_spread${spreadPercent}`
          : r.rateSource;

        const existing = await this.prisma.exchangeRate.findUnique({
          where: {
            providerId_sendCurrency_recvCurrency: {
              providerId,
              sendCurrency: r.sendCurrency,
              recvCurrency: r.recvCurrency,
            },
          },
        });

        if (existing) {
          // Never overwrite a rate that was manually entered by admin.
          // Manual rates are the actual company rates — more accurate than auto-fetch.
          if (existing.rateSource === 'manual') {
            this.logger.log(`⏭  Skipping ${r.sendCurrency}→${r.recvCurrency} for ${provider.companyName} (manual rate protected)`);
            continue;
          }
          await this.prisma.exchangeRate.update({
            where: { id: existing.id },
            data: { rate: adjustedRate, rateSource, isStale: false, lastUpdated: new Date() },
          });
        } else {
          await this.prisma.exchangeRate.create({
            data: {
              providerId,
              sendCurrency: r.sendCurrency,
              recvCurrency: r.recvCurrency,
              rate: adjustedRate,
              rateSource,
              isStale: false,
              lastUpdated: new Date(),
            },
          });
        }
        ratesUpdated++;
      }

      // Mark old rates as stale (older than 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await this.prisma.exchangeRate.updateMany({
        where: { providerId, lastUpdated: { lt: twoHoursAgo } },
        data: { isStale: true },
      });

      await this.prisma.rateUpdateLog.create({
        data: {
          providerId,
          success: true,
          fetchMethod: provider.fetchMethod as any,
          ratesUpdated,
          duration: Date.now() - start,
        },
      });

      this.logger.log(`✅ ${provider.companyName}: ${ratesUpdated} rates updated`);
    } catch (err: any) {
      errorMessage = err.message;
      this.logger.error(`❌ ${provider.companyName} fetch failed: ${err.message}`);

      await this.prisma.rateUpdateLog.create({
        data: {
          providerId,
          success: false,
          fetchMethod: provider.fetchMethod as any,
          ratesUpdated: 0,
          errorMessage,
          duration: Date.now() - start,
        },
      });
    }

    return { providerId, ratesUpdated, success: !errorMessage };
  }

  // ─── Best Rates Summary ───────────────────────────────────────────────────────

  async getBestRates(baseCurrency = 'KRW') {
    const rates = await this.prisma.exchangeRate.findMany({
      where: { sendCurrency: baseCurrency, isStale: false },
      include: {
        provider: { select: { companyName: true, slug: true, logoUrl: true, isVerified: true, status: true } },
      },
    });

    // Group by recvCurrency, pick best rate per currency
    const bestMap = new Map<string, typeof rates[0]>();
    for (const r of rates) {
      if (r.provider.status !== 'ACTIVE') continue;
      const existing = bestMap.get(r.recvCurrency);
      if (!existing || r.rate > existing.rate) {
        bestMap.set(r.recvCurrency, r);
      }
    }

    return Array.from(bestMap.values()).sort((a, b) => a.recvCurrency.localeCompare(b.recvCurrency));
  }

  // ─── Preset Companies ─────────────────────────────────────────────────────────

  getPresetCompanies() {
    return PRESET_COMPANIES;
  }

  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  // ─── Admin Stats ──────────────────────────────────────────────────────────────

  async getStats() {
    const [totalProviders, activeProviders, totalRates, staleRates, recentLogs] = await Promise.all([
      this.prisma.exchangeRateProvider.count(),
      this.prisma.exchangeRateProvider.count({ where: { status: 'ACTIVE' } }),
      this.prisma.exchangeRate.count(),
      this.prisma.exchangeRate.count({ where: { isStale: true } }),
      this.prisma.rateUpdateLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return { totalProviders, activeProviders, totalRates, staleRates, recentLogs };
  }
}
