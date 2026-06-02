import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertFirst(delegate: any, where: any, data: any) {
  const existing = await delegate.findFirst({ where });
  if (existing) return delegate.update({ where: { id: existing.id }, data });
  return delegate.create({ data: { ...where, ...data } });
}

async function seedMarketplaceSaaSConfig() {
  const db = prisma as any;

  await upsertFirst(db.themeSetting, { name: 'AM Mart Default' }, {
    primaryColor: '#10B981',
    secondaryColor: '#183522',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    buttonRadius: 12,
    cardRadius: 16,
    fontFamily: 'Inter',
    isActive: true,
  });

  const platformSettings = [
    ['BRAND_NAME', 'branding', 'AM Mart', true],
    ['SELLER_APPROVAL_REQUIRED', 'seller', true, false],
    ['ALLOW_GLOBAL_SELLERS', 'seller', true, false],
    ['ALLOW_LOCAL_SELLERS', 'seller', true, false],
    ['DEFAULT_COMMISSION_RATE', 'finance', 10, false],
    ['DEFAULT_SETTLEMENT_CYCLE', 'finance', 'MONTHLY', false],
    ['DEFAULT_CURRENCY', 'finance', 'KRW', true],
    ['DOCUMENT_UPLOAD_MAX_MB', 'security', 10, false],
    ['LEGAL_DISCLAIMER', 'legal', 'This platform provides marketplace software features. The platform owner is responsible for checking business registration, mail order sales reporting, tax, payment gateway, privacy, product safety, and local legal requirements before launching the service.', false],
  ];

  for (const [key, group, value, isPublic] of platformSettings) {
    await db.platformSetting.upsert({
      where: { scope_key: { scope: 'platform', key } },
      update: { value, group, isPublic },
      create: { scope: 'platform', key, value, group, isPublic },
    });
  }

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', isDefault: true, sortOrder: 1 },
    { code: 'ko', name: 'Korean', nativeName: '한국어', sortOrder: 2 },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', isEnabled: false, sortOrder: 3 },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', isEnabled: false, sortOrder: 4 },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', isEnabled: false, sortOrder: 5 },
  ];

  for (const language of languages) {
    await db.language.upsert({
      where: { code: language.code },
      update: language,
      create: language,
    });
  }

  const translations = [
    ['home.hero.title', 'Sell to Korea with AM Mart'],
    ['home.hero.subtitle', 'Reach local and global customers with a configurable marketplace platform.'],
    ['home.hero.startSelling', 'Start Selling for Free'],
    ['seller.register.title', 'Seller Registration'],
    ['seller.register.chooseScope', 'Choose seller type'],
    ['seller.register.localSeller', 'Local Korean Seller'],
    ['seller.register.globalSeller', 'Global Seller'],
    ['seller.form.fullName', 'Full name'],
    ['seller.form.businessNumber', 'Business Registration Number'],
    ['seller.form.mailOrderNumber', 'Mail Order Sales Report Number'],
    ['seller.form.bankAccount', 'Bank Account'],
    ['seller.approval.notice', 'You can sign in and start selling only after your account is approved.'],
    ['footer.privacy', 'Privacy Policy'],
    ['footer.terms', 'Terms'],
  ];

  for (const [key, value] of translations) {
    await db.translation.upsert({
      where: { languageCode_key: { languageCode: 'en', key } },
      update: { value, namespace: key.split('.')[0] },
      create: { languageCode: 'en', key, value, namespace: key.split('.')[0] },
    });
  }

  const sellerFields = [
    ['account.fullName', 'account', 'Full name', 'Enter your full name', 'TEXT', true, [], []],
    ['account.email', 'account', 'Email address', 'Enter your email address', 'EMAIL', true, [], []],
    ['account.phone', 'account', 'Phone number', '010-XXXX-XXXX', 'PHONE', true, [], []],
    ['account.password', 'account', 'Password', 'Create a secure password', 'PASSWORD', true, [], []],
    ['account.confirmPassword', 'account', 'Confirm password', 'Confirm your password', 'PASSWORD', true, [], []],
    ['account.preferredLanguage', 'account', 'Preferred language', 'Select language', 'DROPDOWN', true, [], []],
    ['account.countryOfResidence', 'account', 'Country of residence', 'Select country', 'DROPDOWN', true, [], []],
    ['account.sellerAccountType', 'account', 'Seller account type', 'Select seller account type', 'RADIO', true, [], []],
    ['representative.name', 'representative', 'Representative name', 'Legal representative name', 'TEXT', true, [], ['BUSINESS', 'COMPANY', 'GLOBAL']],
    ['representative.dateOfBirth', 'representative', 'Date of birth', 'YYYY-MM-DD', 'DATE', false, [], []],
    ['representative.nationality', 'representative', 'Nationality', 'Select nationality', 'DROPDOWN', false, [], []],
    ['representative.foreignId', 'representative', 'Alien Registration Card or foreign ID number', 'Optional unless enabled by admin', 'TEXT', false, ['LOCAL'], []],
    ['representative.passportNumber', 'representative', 'Passport number', 'Passport number for global sellers', 'TEXT', false, ['GLOBAL'], []],
    ['store.name', 'store', 'Store name', 'Enter your store name', 'TEXT', true, [], []],
    ['store.description', 'store', 'Store description', 'Describe your store', 'TEXTAREA', false, [], []],
    ['store.logo', 'store', 'Store logo upload', 'Upload store logo', 'FILE_UPLOAD', false, [], []],
    ['store.banner', 'store', 'Store banner upload', 'Upload store banner', 'FILE_UPLOAD', false, [], []],
    ['store.category', 'store', 'Store category', 'Select category', 'DROPDOWN', true, [], []],
    ['store.customerServiceEmail', 'store', 'Customer service email', 'support@example.com', 'EMAIL', false, [], []],
    ['store.customerServicePhone', 'store', 'Customer service phone number', 'Customer support phone', 'PHONE', false, [], []],
    ['store.slug', 'store', 'Store URL slug', 'your-store-name', 'TEXT', false, [], []],
    ['korean.businessNumber', 'korean-business', 'Business Registration Number', '000-00-00000', 'TEXT', true, ['LOCAL'], ['BUSINESS', 'COMPANY']],
    ['korean.mailOrderNumber', 'korean-business', 'Mail Order Sales Report Number', '통신판매업 신고번호', 'TEXT', true, ['LOCAL'], ['BUSINESS', 'COMPANY']],
    ['korean.purchaseSafetyConfirmation', 'korean-business', 'Purchase Safety Service Use Confirmation', '구매안전서비스 이용확인증', 'FILE_UPLOAD', false, ['LOCAL'], ['BUSINESS', 'COMPANY']],
    ['global.businessLicense', 'global-business', 'Business license number', 'Business license in your country', 'TEXT', true, ['GLOBAL'], []],
    ['global.countryOfIncorporation', 'global-business', 'Country of business entity', 'Select country', 'DROPDOWN', true, ['GLOBAL'], []],
    ['bank.bankCountry', 'settlement', 'Bank country', 'Select bank country', 'DROPDOWN', true, [], []],
    ['bank.bankName', 'settlement', 'Bank name', 'Enter bank name', 'TEXT', true, [], []],
    ['bank.accountHolderName', 'settlement', 'Account holder name', 'Enter account holder name', 'TEXT', true, [], []],
    ['bank.accountNumber', 'settlement', 'Account number', 'Enter account number', 'TEXT', true, [], []],
    ['bank.swiftCode', 'settlement', 'SWIFT code', 'Required for global sellers', 'TEXT', false, ['GLOBAL'], []],
    ['address.koreanSearch', 'address', 'Search for your address', 'Daum/Kakao postcode search', 'ADDRESS_SEARCH', true, ['LOCAL'], []],
    ['address.globalManual', 'address', 'Global address', 'Enter complete address', 'TEXTAREA', true, ['GLOBAL'], []],
  ];

  let fieldOrder = 1;
  for (const [fieldKey, sectionKey, label, placeholder, fieldType, required, sellerScopes, sellerAccountTypes] of sellerFields) {
    await db.sellerFormField.upsert({
      where: { fieldKey_languageCode: { fieldKey, languageCode: 'en' } },
      update: { sectionKey, label, placeholder, fieldType, required, sellerScopes, sellerAccountTypes, enabled: true, sortOrder: fieldOrder },
      create: { fieldKey, sectionKey, label, placeholder, fieldType, required, sellerScopes, sellerAccountTypes, enabled: true, languageCode: 'en', sortOrder: fieldOrder },
    });
    fieldOrder++;
  }

  const requirements = [
    ['BUSINESS_REGISTRATION_CERTIFICATE', 'Business registration certificate, 사업자등록증', ['LOCAL'], ['BUSINESS', 'COMPANY'], true],
    ['MAIL_ORDER_SALES_CERTIFICATE', 'Mail order sales report certificate or number, 통신판매업 신고증 또는 신고번호', ['LOCAL'], ['BUSINESS', 'COMPANY'], true],
    ['BANKBOOK_COPY', 'Settlement bank account copy, 통장사본', ['LOCAL'], ['BUSINESS', 'COMPANY', 'INDIVIDUAL'], true],
    ['PURCHASE_SAFETY_SERVICE_CONFIRMATION', 'Purchase Safety Service Use Confirmation, 구매안전서비스 이용확인증', ['LOCAL'], ['BUSINESS', 'COMPANY'], false],
    ['GOVERNMENT_ID', 'Representative ID if required', ['LOCAL'], ['INDIVIDUAL', 'BUSINESS', 'COMPANY'], false],
    ['CORPORATE_REGISTRY_CERTIFICATE', 'Corporate registry certificate, 법인등기부등본', ['LOCAL'], ['COMPANY'], false],
    ['CORPORATE_SEAL_CERTIFICATE', 'Corporate seal certificate, 법인인감증명서', ['LOCAL'], ['COMPANY'], false],
    ['BUSINESS_LICENSE', 'Business license of the country of business entity', ['GLOBAL'], ['GLOBAL', 'BUSINESS', 'COMPANY'], true],
    ['PASSPORT', 'Passport or government issued ID', ['GLOBAL'], ['GLOBAL', 'INDIVIDUAL', 'BUSINESS', 'COMPANY'], true],
    ['BANK_STATEMENT', 'Bank account statement or bank letter', ['GLOBAL'], ['GLOBAL', 'BUSINESS', 'COMPANY', 'INDIVIDUAL'], true],
    ['PROOF_OF_BUSINESS_OWNERSHIP', 'Proof of business ownership', ['GLOBAL'], ['GLOBAL', 'BUSINESS', 'COMPANY'], false],
    ['KYC_DOCUMENT', 'KYC verification documents', ['GLOBAL'], ['GLOBAL', 'BUSINESS', 'COMPANY', 'INDIVIDUAL'], false],
    ['PROOF_OF_CONTACT_INFORMATION', 'Proof of contact information if required', ['GLOBAL'], ['GLOBAL', 'BUSINESS', 'COMPANY', 'INDIVIDUAL'], false],
  ];

  let docOrder = 1;
  for (const [documentType, title, sellerScopes, sellerAccountTypes, required] of requirements) {
    await upsertFirst(db.sellerDocumentRequirement, { documentType, languageCode: 'en' }, {
      title,
      required,
      enabled: true,
      sellerScopes,
      sellerAccountTypes,
      sortOrder: docOrder,
    });
    docOrder++;
  }

  const agreements = [
    ['seller_terms', 'I agree to the Seller Terms and Conditions.'],
    ['privacy_policy', 'I agree to the Privacy Policy.'],
    ['personal_information', 'I agree to the collection and use of personal information.'],
    ['business_documents', 'I agree to the collection and review of business documents.'],
    ['important_notices', 'I agree to receive important seller notices by email or SMS.'],
    ['truthful_information', 'I confirm that all submitted business information is true and accurate.'],
    ['false_information', 'I understand that my seller account can be rejected, suspended, or terminated if false information is submitted.'],
    ['prohibited_products', 'I understand that prohibited or illegal products cannot be sold on this platform.'],
    ['commission_policy', 'I agree to the settlement and commission policy.'],
    ['returns_policy', 'I agree to the return, refund, and customer protection policy.'],
  ];

  let agreementOrder = 1;
  for (const [key, title] of agreements) {
    await db.agreementTemplate.upsert({
      where: { key_languageCode_version: { key, languageCode: 'en', version: 1 } },
      update: { title, body: title, required: true, enabled: true, sortOrder: agreementOrder },
      create: { key, title, body: title, languageCode: 'en', version: 1, required: true, enabled: true, sellerScopes: [], sortOrder: agreementOrder },
    });
    agreementOrder++;
  }

  const homepageSections = [
    ['hero', 'HERO', 'Sell to Korea with AM Mart', 'Start with a premium marketplace platform for local and global sellers.', 1],
    ['statistics', 'STATISTICS', 'Marketplace momentum', 'Show active sellers, products, customers, and delivery numbers.', 2],
    ['benefits', 'BENEFITS', 'Why sellers choose us', 'Editable benefit cards for your marketplace offer.', 3],
    ['why-sell', 'WHY_SELL', 'Why sell on AM Mart?', 'Explain seller support, payments, shipping, and growth tools.', 4],
    ['testimonials', 'TESTIMONIALS', 'What sellers say', 'Editable seller testimonials.', 5],
    ['how-it-works', 'HOW_IT_WORKS', 'How it works', 'Create account, upload documents, get approved, start selling.', 6],
    ['support', 'SUPPORT', 'Seller support', 'Show support email, phone, and help center links.', 7],
    ['footer', 'FOOTER', 'Footer', 'Editable footer links and legal policy links.', 8],
  ];

  for (const [sectionKey, type, title, subtitle, sortOrder] of homepageSections) {
    await db.homepageSection.upsert({
      where: { sectionKey_languageCode: { sectionKey, languageCode: 'en' } },
      update: { type, title, subtitle, isVisible: true, sortOrder },
      create: { sectionKey, type, title, subtitle, languageCode: 'en', isVisible: true, sortOrder },
    });
  }

  const policyPages = [
    ['terms-of-service', 'TERMS_OF_SERVICE', 'Terms of Service'],
    ['seller-terms', 'SELLER_TERMS', 'Seller Terms'],
    ['privacy-policy', 'PRIVACY_POLICY', 'Privacy Policy'],
    ['personal-information-processing-policy', 'PERSONAL_INFORMATION_PROCESSING', 'Personal Information Processing Policy'],
    ['refund-policy', 'REFUND_POLICY', 'Refund Policy'],
    ['return-exchange-policy', 'RETURN_EXCHANGE_POLICY', 'Return and Exchange Policy'],
    ['shipping-policy', 'SHIPPING_POLICY', 'Shipping Policy'],
    ['payment-policy', 'PAYMENT_POLICY', 'Payment Policy'],
    ['settlement-policy', 'SETTLEMENT_POLICY', 'Settlement Policy'],
    ['prohibited-items-policy', 'PROHIBITED_ITEMS_POLICY', 'Prohibited Items Policy'],
    ['product-safety-policy', 'PRODUCT_SAFETY_POLICY', 'Product Safety Policy'],
    ['consumer-dispute-policy', 'CONSUMER_DISPUTE_POLICY', 'Consumer Dispute Policy'],
    ['marketing-consent-policy', 'MARKETING_CONSENT_POLICY', 'Marketing Consent Policy'],
    ['seller-verification-policy', 'SELLER_VERIFICATION_POLICY', 'Seller Verification Policy'],
  ];

  for (const [slug, pageType, title] of policyPages) {
    await db.cMSPage.upsert({
      where: { slug_languageCode_version: { slug, languageCode: 'en', version: 1 } },
      update: { pageType, title, status: 'DRAFT' },
      create: { slug, pageType, title, content: `${title} content should be reviewed and published by the platform owner.`, languageCode: 'en', version: 1, status: 'DRAFT' },
    });
  }

  const paymentProviders = [
    ['TOSS_PAYMENTS', 'Toss Payments'],
    ['KG_INICIS', 'KG Inicis'],
    ['NHN_KCP', 'NHN KCP'],
    ['KAKAO_PAY', 'Kakao Pay'],
    ['NAVER_PAY', 'Naver Pay'],
    ['BANK_TRANSFER', 'Bank Transfer'],
    ['ESCROW', 'Escrow / Purchase Safety Service'],
  ];

  for (const [provider, displayName] of paymentProviders) {
    await db.paymentProviderSetting.upsert({
      where: { provider },
      update: { displayName, enabled: false, testMode: true, supportedCurrencies: ['KRW'] },
      create: { provider, displayName, enabled: false, testMode: true, supportedCurrencies: ['KRW'] },
    });
  }

  const shippingMethods = [
    ['Seller Direct Shipping', 'SELLER_DIRECT'],
    ['Courier Shipping', 'COURIER'],
    ['Pickup', 'PICKUP'],
    ['Free Shipping', 'FREE_SHIPPING'],
    ['Conditional Free Shipping', 'CONDITIONAL_FREE_SHIPPING'],
    ['Fulfillment Placeholder', 'FULFILLMENT_PLACEHOLDER'],
  ];

  let shipOrder = 1;
  for (const [name, type] of shippingMethods) {
    await upsertFirst(db.shippingMethod, { name }, {
      type,
      enabled: type !== 'FULFILLMENT_PLACEHOLDER',
      baseFee: 0,
      sortOrder: shipOrder,
    });
    shipOrder++;
  }

  await upsertFirst(db.commissionRule, { name: 'Default marketplace commission' }, {
    commissionRate: 10,
    priority: 1,
    enabled: true,
  });

  console.log('✅ Marketplace SaaS defaults initialized');
}

async function seedParcelDeliverySystem() {
  console.log('\n📦 Seeding parcel delivery system...');

  // ── Default Fulfillment Center ──
  const fc = await prisma.fulfillmentCenter.upsert({
    where: { code: 'FC-SEOUL-01' },
    update: {},
    create: {
      name: 'Seoul Main Warehouse',
      code: 'FC-SEOUL-01',
      address: '123 Warehouse Road, Gangnam-gu',
      city: 'Seoul',
      district: 'Gangnam-gu',
      postalCode: '06000',
      lat: 37.4979,
      lng: 127.0276,
      capacity: 10000,
      operatingHoursStart: '06:00',
      operatingHoursEnd: '22:00',
      isActive: true,
    },
  });
  console.log('  ✅ Default fulfillment center created');

  // ── Default Warehouse Bins ──
  const binSections = ['A', 'B', 'C'];
  for (const section of binSections) {
    for (let shelf = 1; shelf <= 3; shelf++) {
      for (let pos = 1; pos <= 5; pos++) {
        const binCode = `${section}${shelf}-${String(pos).padStart(2, '0')}`;
        await prisma.warehouseBin.upsert({
          where: { fulfillmentCenterId_binCode: { fulfillmentCenterId: fc.id, binCode } },
          update: {},
          create: {
            fulfillmentCenterId: fc.id,
            binCode,
            section,
            aisle: `${section}`,
            shelf: String(shelf),
            position: String(pos),
            capacity: 50,
            binType: 'STANDARD',
          },
        });
      }
    }
  }
  console.log('  ✅ 45 warehouse bins created (A/B/C sections)');

  // ── Default Delivery Time Slots ──
  const timeSlots = [
    { name: 'Morning', startTime: '09:00', endTime: '12:00', surcharge: 0, isExpress: false, daysOfWeek: [1,2,3,4,5,6] },
    { name: 'Afternoon', startTime: '12:00', endTime: '17:00', surcharge: 0, isExpress: false, daysOfWeek: [1,2,3,4,5,6] },
    { name: 'Evening', startTime: '17:00', endTime: '21:00', surcharge: 1000, isExpress: false, daysOfWeek: [1,2,3,4,5,6] },
    { name: 'Express', startTime: '09:00', endTime: '21:00', surcharge: 3000, isExpress: true, daysOfWeek: [1,2,3,4,5,6,0] },
  ];
  for (const slot of timeSlots) {
    const existing = await prisma.deliveryTimeSlot.findFirst({ where: { name: slot.name } });
    if (!existing) {
      await prisma.deliveryTimeSlot.create({ data: { ...slot, maxOrders: 50, cutoffHours: 2 } });
    }
  }
  console.log('  ✅ Delivery time slots created (Morning/Afternoon/Evening/Express)');

  // ── Default Delivery Fee Rules ──
  const feeRules = [
    { name: 'Standard Flat Fee', feeType: 'FLAT' as const, baseFee: 3000, priority: 0 },
    { name: 'Weight Surcharge', feeType: 'WEIGHT_BASED' as const, baseFee: 0, perKgFee: 500, priority: 1 },
    { name: 'Express Delivery', feeType: 'FLAT' as const, baseFee: 5000, expressMultiplier: 1.5, priority: 2 },
  ];
  for (const rule of feeRules) {
    const existing = await prisma.deliveryFeeRule.findFirst({ where: { name: rule.name } });
    if (!existing) {
      await prisma.deliveryFeeRule.create({ data: rule });
    }
  }
  console.log('  ✅ Delivery fee rules created (Standard/Weight/Express)');

  // ── Default Driver Shifts ──
  const shifts = [
    { name: 'Morning Shift', startTime: '06:00', endTime: '14:00', maxDrivers: 20, daysOfWeek: [1,2,3,4,5,6] },
    { name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', maxDrivers: 20, daysOfWeek: [1,2,3,4,5,6] },
    { name: 'Full Day', startTime: '08:00', endTime: '20:00', maxDrivers: 10, daysOfWeek: [1,2,3,4,5,6,0] },
  ];
  for (const shift of shifts) {
    const existing = await prisma.driverShift.findFirst({ where: { name: shift.name } });
    if (!existing) {
      await prisma.driverShift.create({ data: { ...shift, fulfillmentCenterId: fc.id } });
    }
  }
  console.log('  ✅ Driver shifts created (Morning/Afternoon/Full Day)');

  // ── Parcel delivery app settings ──
  const parcelSettings = [
    { key: 'PARCEL_MAX_DELIVERY_ATTEMPTS', value: '3' },
    { key: 'PARCEL_DEFAULT_PROOF_TYPE', value: 'PHOTO' },
    { key: 'PARCEL_COD_ENABLED', value: 'false' },
    { key: 'PARCEL_AUTO_ASSIGN_ENABLED', value: 'false' },
    { key: 'PARCEL_TRACKING_PREFIX', value: 'AMM' },
    { key: 'PARCEL_REQUIRE_SCAN_BEFORE_START', value: 'true' },
    { key: 'PARCEL_OFFLINE_MODE_ENABLED', value: 'true' },
    { key: 'PARCEL_GPS_TRACKING_INTERVAL_SEC', value: '30' },
    { key: 'PARCEL_DEFAULT_ZONE_FEE', value: '3000' },
    { key: 'PARCEL_EXPRESS_SURCHARGE', value: '3000' },
    { key: 'PARCEL_WEIGHT_SURCHARGE_PER_KG', value: '500' },
    { key: 'PARCEL_FREE_SHIPPING_THRESHOLD', value: '30000' },
  ];
  for (const s of parcelSettings) {
    await prisma.appSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('  ✅ Parcel delivery settings initialized');

  console.log('📦 Parcel delivery system seed complete!');
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ───────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin1234!', 10);
  const admin = await prisma.user.upsert({
    where: { phone: '+82100000000' },
    update: {
      email: 'admin@ammart.com',
      fullName: 'AM Mart Admin',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isPhoneVerified: true,
      status: 'ACTIVE',
    },
    create: {
      phone: '+82100000000',
      email: 'admin@ammart.com',
      fullName: 'AM Mart Admin',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isPhoneVerified: true,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // ─── Categories ────────────────────────────────────────────────────────────
  const categoriesData = [
    { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', icon: '🥦' },
    { name: 'Meat & Seafood', slug: 'meat-seafood', icon: '🥩' },
    { name: 'Dairy & Eggs', slug: 'dairy-eggs', icon: '🥛' },
    { name: 'Bakery', slug: 'bakery', icon: '🍞' },
    { name: 'Beverages', slug: 'beverages', icon: '🧃' },
    { name: 'Snacks', slug: 'snacks', icon: '🍿' },
    { name: 'Frozen Foods', slug: 'frozen-foods', icon: '🧊' },
    { name: 'Personal Care', slug: 'personal-care', icon: '🧴' },
    { name: 'Household', slug: 'household', icon: '🏠' },
    { name: 'International', slug: 'international', icon: '🌍' },
  ];

  const categories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true, sortOrder: categoriesData.indexOf(cat) + 1 },
    });
    categories[cat.slug] = created;
  }
  console.log(`✅ ${categoriesData.length} categories created`);

  // ─── Demo Seller ──────────────────────────────────────────────────────────
  const sellerPassword = await bcrypt.hash('Seller@1234', 10);
  const sellerUser = await prisma.user.upsert({
    where: { phone: '+82101111111' },
    update: {},
    create: {
      phone: '+82101111111',
      email: 'seller@ammart.com',
      fullName: 'Demo Seller',
      passwordHash: sellerPassword,
      role: 'SELLER',
      isPhoneVerified: true,
      status: 'ACTIVE',
    },
  });

  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      storeName: 'Fresh Mart Korea',
      storeSlug: 'fresh-mart-korea',
      storeDescription: 'Your local grocery store with daily fresh produce',
      businessRegNumber: 'KR-2024-00001',
      commissionRate: 10,
      sellerStatus: 'APPROVED',
    },
  });
  console.log('✅ Demo seller created:', seller.storeName);

  // ─── Demo Rider ───────────────────────────────────────────────────────────
  const riderPassword = await bcrypt.hash('Rider@1234', 10);
  const riderUser = await prisma.user.upsert({
    where: { phone: '+82102222222' },
    update: {},
    create: {
      phone: '+82102222222',
      email: 'rider@ammart.com',
      fullName: 'Kim Min-jun',
      passwordHash: riderPassword,
      role: 'RIDER',
      isPhoneVerified: true,
      status: 'ACTIVE',
    },
  });

  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: {},
    create: {
      userId: riderUser.id,
      vehicleType: 'MOTORCYCLE',
      vehicleNumber: '12가3456',
      licenseNumber: 'KR-DL-2024-001',
      riderStatus: 'AVAILABLE',
      isOnline: false,
      totalDeliveries: 0,
      rating: 4.8,
    },
  });
  console.log('✅ Demo rider created');

  // ─── Demo Customer ────────────────────────────────────────────────────────
  const customerPassword = await bcrypt.hash('Customer@1234', 10);
  const customerUser = await prisma.user.upsert({
    where: { phone: '+82103333333' },
    update: {},
    create: {
      phone: '+82103333333',
      email: 'customer@ammart.com',
      fullName: 'Park Ji-eun',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      isPhoneVerified: true,
      status: 'ACTIVE',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id },
  });

  await prisma.wallet.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id, balance: 50000 },
  });

  await prisma.address.create({
    data: {
      customerId: customer.id,
      label: 'Home',
      fullName: 'Park Ji-eun',
      phone: '+82103333333',
      addressLine1: '123 Gangnam-daero',
      city: 'Seoul',
      district: 'Gangnam-gu',
      postalCode: '06000',
      lat: 37.4979,
      lng: 127.0276,
      isDefault: true,
    },
  }).catch(() => {});
  console.log('✅ Demo customer created with wallet (₩50,000)');

  // ─── Sample Products ──────────────────────────────────────────────────────
  const productsData = [
    { name: 'Fuji Apples 1kg', price: 5900, discountPrice: 4900, stock: 100, unit: 'kg', categorySlug: 'fruits-vegetables', description: 'Sweet and crunchy Fuji apples from Cheongju', image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=80' },
    { name: 'Strawberries 500g', price: 8900, stock: 60, unit: 'pack', categorySlug: 'fruits-vegetables', description: 'Fresh Korean strawberries', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&q=80' },
    { name: 'Banana 1 bunch', price: 3500, stock: 80, unit: 'bunch', categorySlug: 'fruits-vegetables', description: 'Ripe and sweet bananas', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=80' },
    { name: 'Beef Bulgogi 500g', price: 18900, discountPrice: 16900, stock: 30, unit: '500g', categorySlug: 'meat-seafood', description: 'Pre-marinated beef bulgogi', image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80' },
    { name: 'Chicken Breast 500g', price: 9900, stock: 50, unit: '500g', categorySlug: 'meat-seafood', description: 'Boneless skinless chicken breast', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80' },
    { name: 'Fresh Salmon 200g', price: 14900, stock: 25, unit: '200g', categorySlug: 'meat-seafood', description: 'Norwegian fresh salmon fillet', image: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400&q=80' },
    { name: 'Whole Milk 1L', price: 2900, stock: 120, unit: 'L', categorySlug: 'dairy-eggs', description: 'Fresh whole milk', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80' },
    { name: 'Eggs 30 pack', price: 7900, discountPrice: 6900, stock: 70, unit: 'pack', categorySlug: 'dairy-eggs', description: 'Farm fresh eggs, 30 count', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=80' },
    { name: 'Mozzarella 200g', price: 5900, stock: 40, unit: '200g', categorySlug: 'dairy-eggs', description: 'Italian style mozzarella', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80' },
    { name: 'Sourdough Bread', price: 6900, stock: 20, unit: 'loaf', categorySlug: 'bakery', description: 'Artisan sourdough, baked daily', image: 'https://images.unsplash.com/photo-1585478259715-4d3a77c44bca?w=400&q=80' },
    { name: 'Croissant 4 pack', price: 4900, stock: 30, unit: 'pack', categorySlug: 'bakery', description: 'Buttery French croissants', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80' },
    { name: 'Sparkling Water 1.5L', price: 1900, stock: 200, unit: 'bottle', categorySlug: 'beverages', description: 'Natural sparkling mineral water', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80' },
    { name: 'Orange Juice 1L', price: 3900, discountPrice: 3200, stock: 80, unit: 'L', categorySlug: 'beverages', description: '100% pure squeezed orange juice', image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80' },
    { name: 'Lays Chips 135g', price: 2500, stock: 150, unit: 'bag', categorySlug: 'snacks', description: 'Classic salted potato chips', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80' },
    { name: 'Dark Chocolate 100g', price: 3900, stock: 90, unit: 'bar', categorySlug: 'snacks', description: '72% dark chocolate bar', image: 'https://images.unsplash.com/photo-1606312619070-d48b5c7e04c8?w=400&q=80' },
    { name: 'Greek Yogurt 450g', price: 4500, stock: 60, unit: 'cup', categorySlug: 'dairy-eggs', description: 'Thick and creamy Greek yogurt', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80' },
    { name: 'Avocado 2 pack', price: 5500, discountPrice: 4500, stock: 40, unit: 'pack', categorySlug: 'fruits-vegetables', description: 'Perfectly ripe Hass avocados', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80' },
    { name: 'Ramen Noodles 5 pack', price: 3500, stock: 200, unit: 'pack', categorySlug: 'snacks', description: 'Korean instant ramen, spicy', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80' },
    { name: 'Green Tea 20 bags', price: 5900, stock: 80, unit: 'box', categorySlug: 'beverages', description: 'Premium Korean green tea', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80' },
    { name: 'Shampoo 400ml', price: 8900, discountPrice: 7500, stock: 50, unit: 'bottle', categorySlug: 'personal-care', description: 'Moisturizing shampoo for all hair types', image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&q=80' },
  ];

  let productCount = 0;
  for (const p of productsData) {
    const cat = categories[p.categorySlug];
    if (!cat) continue;
    const product = await prisma.product.create({
      data: {
        sellerId: seller.id,
        categoryId: cat.id,
        name: p.name,
        description: p.description,
        price: p.price,
        discountPrice: (p as any).discountPrice || null,
        stock: p.stock,
        unit: p.unit,
        status: 'ACTIVE',
        isFeatured: productCount < 6,
      },
    }).catch(() => null);
    if (product && p.image) {
      await prisma.productImage.create({
        data: { productId: product.id, url: p.image, alt: p.name, sortOrder: 0 },
      }).catch(() => {});
    }
    productCount++;
  }
  console.log(`✅ ${productCount} sample products created with images`);

  // ─── SIM Numbers ──────────────────────────────────────────────────────────
  const simNumbers = [
    { number: '01012341234', carrier: 'SKT', simType: 'PREPAID', lastFour: '1234', price: 30000 },
    { number: '01056785678', carrier: 'KT', simType: 'VOICE_DATA', lastFour: '5678', price: 35000 },
    { number: '01099009900', carrier: 'LG_UPLUS', simType: 'DATA_ONLY', lastFour: '9900', price: 25000 },
    { number: '01011112222', carrier: 'SKT', simType: 'PREPAID', lastFour: '2222', price: 30000 },
    { number: '01033334444', carrier: 'MVNO', simType: 'DATA_ONLY', lastFour: '4444', price: 22000 },
    { number: '01055556666', carrier: 'KT', simType: 'PREPAID', lastFour: '6666', price: 30000 },
    { number: '01077778888', carrier: 'SKT', simType: 'VOICE_DATA', lastFour: '8888', price: 35000 },
    { number: '01099991111', carrier: 'LG_UPLUS', simType: 'PREPAID', lastFour: '1111', price: 30000 },
  ];

  let simCount = 0;
  for (const sim of simNumbers) {
    await prisma.simNumber.create({
      data: {
        fullNumber: sim.number,
        maskedNumber: `010-XXXX-${sim.lastFour.slice(2)}`,
        carrier: sim.carrier as any,
        simType: sim.simType as any,
        status: 'AVAILABLE',
        price: sim.price,
        lastFourDigits: sim.lastFour,
      },
    }).catch(() => {});
    simCount++;
  }
  console.log(`✅ ${simCount} SIM numbers added`);

  // ─── Banners ──────────────────────────────────────────────────────────────
  const banners = [
    { title: 'Fresh Groceries Delivered!', subtitle: 'Free delivery on orders over ₩30,000', position: 1, imageUrl: '' },
    { title: 'Get Your SIM Card', subtitle: 'Choose from SKT, KT, LG U+ and more', position: 2, imageUrl: '' },
    { title: 'International Top-Up', subtitle: 'Send credits to 100+ countries', position: 3, imageUrl: '' },
  ];

  for (const b of banners) {
    await prisma.banner.create({
      data: { ...b, isActive: true, linkType: 'NONE' },
    }).catch(() => {});
  }
  console.log('✅ 3 banners created');

  // ─── App Settings ─────────────────────────────────────────────────────────
  const settings = [
    { key: 'APP_NAME', value: 'AM Mart' },
    { key: 'CURRENCY', value: 'KRW' },
    { key: 'DELIVERY_FEE', value: '3000' },
    { key: 'FREE_DELIVERY_THRESHOLD', value: '30000' },
    { key: 'DEFAULT_COMMISSION_RATE', value: '10' },
    { key: 'SIM_RESERVATION_TIMEOUT', value: '15' },
    { key: 'SUPPORT_EMAIL', value: 'support@ammart.com' },
    { key: 'SUPPORT_PHONE', value: '+82-2-1234-5678' },
  ];

  for (const s of settings) {
    await prisma.appSettings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('✅ App settings initialized');

  // ── Parcel Delivery System Seed Data ──
  await seedParcelDeliverySystem();

  await seedMarketplaceSaaSConfig();

  console.log('\n🎉 Seeding complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('Test Accounts:');
  console.log('  Admin:    admin@ammart.com / Admin1234!');
  console.log('  Seller:   +82101111111 / Seller@1234');
  console.log('  Rider:    +82102222222 / Rider@1234');
  console.log('  Customer: +82103333333 / Customer@1234');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
