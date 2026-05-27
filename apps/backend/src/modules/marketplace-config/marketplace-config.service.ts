import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type RegistrationConfigQuery = {
  scope?: string;
  accountType?: string;
  lang?: string;
};

@Injectable()
export class MarketplaceConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicConfig(lang = 'en') {
    const db = this.prisma as any;
    const [settings, theme, translations] = await Promise.all([
      db.platformSetting.findMany({ where: { isPublic: true } }),
      db.themeSetting.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } }),
      db.translation.findMany({ where: { languageCode: lang } }),
    ]);

    return {
      settings: this.settingsToObject(settings),
      theme,
      translations: this.translationsToObject(translations),
    };
  }

  async getSellerRegistrationConfig(query: RegistrationConfigQuery) {
    const db = this.prisma as any;
    const lang = query.lang || 'en';
    const sellerScopes = query.scope ? [query.scope] : undefined;
    const sellerAccountTypes = query.accountType ? [query.accountType] : undefined;

    const [fields, documentRequirements, agreements] = await Promise.all([
      db.sellerFormField.findMany({
        where: {
          languageCode: lang,
          enabled: true,
          ...(sellerScopes ? { OR: [{ sellerScopes: { isEmpty: true } }, { sellerScopes: { hasSome: sellerScopes } }] } : {}),
          ...(sellerAccountTypes
            ? { AND: [{ OR: [{ sellerAccountTypes: { isEmpty: true } }, { sellerAccountTypes: { hasSome: sellerAccountTypes } }] }] }
            : {}),
        },
        orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
      }),
      db.sellerDocumentRequirement.findMany({
        where: {
          languageCode: lang,
          enabled: true,
          ...(sellerScopes ? { OR: [{ sellerScopes: { isEmpty: true } }, { sellerScopes: { hasSome: sellerScopes } }] } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }],
      }),
      db.agreementTemplate.findMany({
        where: {
          languageCode: lang,
          enabled: true,
          ...(sellerScopes ? { OR: [{ sellerScopes: { isEmpty: true } }, { sellerScopes: { hasSome: sellerScopes } }] } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }],
      }),
    ]);

    return { fields, documentRequirements, agreements };
  }

  async getHomepage(lang = 'en') {
    const db = this.prisma as any;
    return db.homepageSection.findMany({
      where: { languageCode: lang, isVisible: true },
      orderBy: [{ sortOrder: 'asc' }],
    });
  }

  async getAdminOverview() {
    const db = this.prisma as any;
    const [
      sellerFormFields,
      documentRequirements,
      homepageSections,
      policyPages,
      translations,
      paymentProviders,
      shippingMethods,
      commissionRules,
    ] = await Promise.all([
      db.sellerFormField.count(),
      db.sellerDocumentRequirement.count(),
      db.homepageSection.count(),
      db.cMSPage.count(),
      db.translation.count(),
      db.paymentProviderSetting.count(),
      db.shippingMethod.count(),
      db.commissionRule.count(),
    ]);

    return {
      sellerFormFields,
      documentRequirements,
      homepageSections,
      policyPages,
      translations,
      paymentProviders,
      shippingMethods,
      commissionRules,
    };
  }

  async getSettings(group?: string) {
    const db = this.prisma as any;
    return db.platformSetting.findMany({
      where: group ? { group } : {},
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  async upsertSetting(key: string, body: any, userId: string) {
    const db = this.prisma as any;
    const scope = body.scope || 'platform';
    return db.platformSetting.upsert({
      where: { scope_key: { scope, key } },
      update: {
        value: body.value,
        valueType: body.valueType || 'JSON',
        group: body.group || 'general',
        description: body.description,
        isPublic: Boolean(body.isPublic),
        updatedBy: userId,
      },
      create: {
        scope,
        key,
        value: body.value,
        valueType: body.valueType || 'JSON',
        group: body.group || 'general',
        description: body.description,
        isPublic: Boolean(body.isPublic),
        updatedBy: userId,
      },
    });
  }

  async getSellerFormFields(lang = 'en') {
    const db = this.prisma as any;
    return db.sellerFormField.findMany({
      where: { languageCode: lang },
      orderBy: [{ sectionKey: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createSellerFormField(body: any, userId: string) {
    const db = this.prisma as any;
    return db.sellerFormField.create({
      data: {
        ...body,
        sellerScopes: body.sellerScopes || [],
        sellerAccountTypes: body.sellerAccountTypes || [],
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateSellerFormField(id: string, body: any, userId: string) {
    const db = this.prisma as any;
    return db.sellerFormField.update({ where: { id }, data: { ...body, updatedBy: userId } });
  }

  async getDocumentRequirements(lang = 'en') {
    const db = this.prisma as any;
    return db.sellerDocumentRequirement.findMany({
      where: { languageCode: lang },
      orderBy: [{ sortOrder: 'asc' }],
    });
  }

  async createDocumentRequirement(body: any, userId: string) {
    const db = this.prisma as any;
    return db.sellerDocumentRequirement.create({
      data: {
        ...body,
        sellerScopes: body.sellerScopes || [],
        sellerAccountTypes: body.sellerAccountTypes || [],
        acceptedFileTypes: body.acceptedFileTypes || ['PDF', 'JPG', 'JPEG', 'PNG'],
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateDocumentRequirement(id: string, body: any, userId: string) {
    const db = this.prisma as any;
    return db.sellerDocumentRequirement.update({ where: { id }, data: { ...body, updatedBy: userId } });
  }

  async getHomepageSections(lang = 'en') {
    const db = this.prisma as any;
    return db.homepageSection.findMany({
      where: { languageCode: lang },
      orderBy: [{ sortOrder: 'asc' }],
    });
  }

  async createHomepageSection(body: any, userId: string) {
    const db = this.prisma as any;
    return db.homepageSection.create({ data: { ...body, createdBy: userId, updatedBy: userId } });
  }

  async updateHomepageSection(id: string, body: any, userId: string) {
    const db = this.prisma as any;
    return db.homepageSection.update({ where: { id }, data: { ...body, updatedBy: userId } });
  }

  async deleteHomepageSection(id: string) {
    const db = this.prisma as any;
    await db.homepageSection.delete({ where: { id } });
    return { message: 'Homepage section deleted' };
  }

  async getPolicyPages(lang = 'en') {
    const db = this.prisma as any;
    return db.cMSPage.findMany({
      where: { languageCode: lang },
      orderBy: [{ pageType: 'asc' }, { version: 'desc' }],
    });
  }

  async createPolicyPage(body: any, userId: string) {
    const db = this.prisma as any;
    return db.cMSPage.create({
      data: {
        ...body,
        languageCode: body.languageCode || 'en',
        version: body.version || 1,
        status: body.status || 'DRAFT',
        lastUpdatedBy: userId,
      },
    });
  }

  async updatePolicyPage(id: string, body: any, userId: string) {
    const db = this.prisma as any;
    return db.cMSPage.update({ where: { id }, data: { ...body, lastUpdatedBy: userId } });
  }

  async getTranslations(lang = 'en') {
    const db = this.prisma as any;
    return db.translation.findMany({
      where: { languageCode: lang },
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });
  }

  async upsertTranslation(key: string, body: any, userId: string) {
    const db = this.prisma as any;
    const languageCode = body.languageCode || 'en';
    return db.translation.upsert({
      where: { languageCode_key: { languageCode, key } },
      update: {
        value: body.value,
        namespace: body.namespace || key.split('.')[0],
        description: body.description,
        updatedBy: userId,
      },
      create: {
        languageCode,
        key,
        value: body.value,
        namespace: body.namespace || key.split('.')[0],
        description: body.description,
        updatedBy: userId,
      },
    });
  }

  async getPaymentProviders() {
    const db = this.prisma as any;
    return db.paymentProviderSetting.findMany({ orderBy: [{ displayName: 'asc' }] });
  }

  async updatePaymentProvider(id: string, body: any, userId: string) {
    const db = this.prisma as any;
    return db.paymentProviderSetting.update({
      where: { id },
      data: {
        displayName: body.displayName,
        enabled: body.enabled,
        testMode: body.testMode,
        publicConfig: body.publicConfig,
        secretRef: body.secretRef,
        webhookUrl: body.webhookUrl,
        settlementFeeRate: body.settlementFeeRate,
        supportedCurrencies: body.supportedCurrencies,
        updatedBy: userId,
      },
    });
  }

  async getShippingMethods() {
    const db = this.prisma as any;
    return db.shippingMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async createShippingMethod(body: any) {
    const db = this.prisma as any;
    return db.shippingMethod.create({ data: body });
  }

  async updateShippingMethod(id: string, body: any) {
    const db = this.prisma as any;
    return db.shippingMethod.update({ where: { id }, data: body });
  }

  async getCommissionRules() {
    const db = this.prisma as any;
    return db.commissionRule.findMany({ orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] });
  }

  async createCommissionRule(body: any) {
    const db = this.prisma as any;
    return db.commissionRule.create({ data: body });
  }

  async updateCommissionRule(id: string, body: any) {
    const db = this.prisma as any;
    return db.commissionRule.update({ where: { id }, data: body });
  }

  private settingsToObject(settings: any[]) {
    return settings.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, unknown>);
  }

  private translationsToObject(translations: any[]) {
    return translations.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);
  }
}
