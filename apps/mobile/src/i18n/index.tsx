import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = '@ammart_language';

export type Language = 'en' | 'ko';

const translations = {
  en: {
    // Navigation
    home: 'Home', cart: 'Cart', orders: 'Orders', profile: 'Profile', search: 'Search',
    categories: 'Categories',
    // Home
    welcome: 'Welcome to AM Mart', hello: 'Hello',
    whatLooking: 'What are you looking for today?',
    searchPlaceholder: 'Search groceries, SIM cards...',
    shopByCategory: 'Shop by Category', seeAll: 'See All',
    featuredProducts: 'Featured Products', popularItems: 'Popular Items',
    bannerTitle: 'Quality Groceries Daily',
    bannerSubtitle: 'Free delivery on orders over {threshold}',
    addMoreFree: 'Add {currency}{amount} more for free delivery',
    // Services
    simCards: 'SIM Cards', topUp: 'Top-Up', myOrders: 'My Orders',
    browseNumbers: 'Browse numbers', localIntl: 'Local & international', trackDeliveries: 'Track deliveries',
    // Categories
    meatFish: 'Meat & Fish', dairyMilk: 'Dairy & Milk', bakery: 'Bakery',
    riceGrains: 'Rice & Grains', beverages: 'Beverages', personalCare: 'Personal Care',
    cleaning: 'Cleaning', snacks: 'Snacks',
    // Cart
    myCart: 'My Cart', clearAll: 'Clear All', subtotal: 'Subtotal',
    deliveryFee: 'Delivery Fee', free: 'FREE', total: 'Total',
    proceedCheckout: 'Proceed to Checkout', emptyCart: 'Your cart is empty',
    emptyCartSub: 'Add some items to get started', startShopping: 'Start Shopping',
    // Profile
    myProfile: 'My Profile', myAddresses: 'My Addresses', myWallet: 'My Wallet',
    wishlist: 'Wishlist', notifications: 'Notifications', support: 'Support',
    termsPrivacy: 'Terms & Privacy', signOut: 'Sign Out', language: 'Language',
    pushNotifications: 'Push Notifications', guestUser: 'Guest',
    signInToAccess: 'Sign in to access your full profile',
    signIn: 'Sign In', createAccount: 'Create Account',
    myInformation: 'My Information', editProfileDetails: 'Edit profile details',
    deliveryAddresses: 'Delivery addresses', savedItems: 'Saved items',
    account: 'Account', settingsSupport: 'Settings & Support',
    ordersCount: 'Orders', wishlistCount: 'Wishlist', walletBalance: 'Wallet',
    // Orders
    myOrdersTitle: 'My Orders', noOrdersYet: 'No orders yet',
    orderHistoryEmpty: 'Your order history will appear here',
    statusAll: 'All', statusPending: 'Pending', statusConfirmed: 'Confirmed',
    statusDelivery: 'On the way', statusDelivered: 'Delivered', statusCancelled: 'Cancelled',
    buyAgain: 'Buy Again', trackOrder: 'Track', orderDetails: 'Details',
    expectedBy: 'Expected by', deliveredOn: 'Delivered',
    orderTotal: 'Total',
    // Top-up
    mobileTopUp: 'Mobile Top-Up', localRecharge: 'Local (Korea)',
    international: 'International', selectCountry: 'Select Country',
    mobileOperator: 'Mobile Operator', phoneToTopUp: 'Phone Number to Top-Up',
    selectAmount: 'Select Amount', proceedPayment: 'Proceed to Payment',
    totalCharge: 'Total Charge', serviceFee: 'Service Fee',
    exchangeRate: 'Exchange Rate', searchCountries: 'Search countries...',
    amountKRW: 'Amount (₩ KRW)', topupSuccess: 'Top-up successful!',
    confirmTopUp: 'Confirm Top-Up', payNow: 'Pay ₩{amount}',
    processingNote: 'Top-up is usually instant. May take up to 24 hours.',
    viewHistory: 'View Top-Up History', topupHistory: 'Top-Up History',
    noHistory: 'No top-up history yet',
    // Auth
    groceriesMore: 'Groceries & More', fastDelivery: 'Fast Delivery',
    signInOTP: 'Sign in with OTP instead',
    // Products
    allProducts: 'All Products', noProducts: 'No products found',
    searchProducts: 'Search products...', sortBy: 'Sort by',
    tryDifferent: 'Try a different search or category',
    // Search screen
    recentSearches: 'Recent Searches', browseCategories: 'Browse Categories',
    popularSearches: 'Popular Searches', searchProductsBrands: 'Search products, brands...',
    noResultsFor: 'No results for', tryDifferentKeyword: 'Try a different keyword or browse categories',
    shop: 'Shop',
    // Common
    loading: 'Loading...', cancel: 'Cancel', confirm: 'Confirm',
    back: 'Back', updating: 'Updating app...', version: 'AM Mart v1.0.0',
    comingSoon: 'Coming Soon', appVersion: 'v1.0.0', paymentMethod: 'Payment Method',
    wallet: 'AM Mart Wallet', creditCard: 'Credit / Debit Card',
    priceBreakdown: 'Price Breakdown', amountIn: 'Amount ({currency})',
    amountKRWLabel: 'Amount in KRW',
    // Exchange Rates
    rateInquiry: 'Rate Inquiry', bestRates: 'Best Rates Today',
    compareRates: 'Compare Rates', sendCurrency: 'Send Currency',
    receiveCurrency: 'Receive Currency', sendAmount: 'You Send',
    receiveAmount: 'You Get', transferFee: 'Transfer Fee',
    transferTime: 'Transfer Time', openApp: 'Open App',
    openWebsite: 'Visit Website', verified: 'Verified',
    featured: 'Featured', noRatesAvailable: 'No rates available for this pair',
    tryDifferentPair: 'Try a different currency pair or check back later.',
    liveRates: 'Live Exchange Rates', rateLastUpdated: 'Updated',
    bestDeal: 'Best Deal', comparisonTitle: 'Send {amount} {send}',
    rateSource: 'Source', youReceive: 'You receive',
    providerList: 'All Providers', loading: 'Loading...',
    staleRate: 'Rate may be outdated',
  },
  ko: {
    // Navigation
    home: '홈', cart: '장바구니', orders: '주문', profile: '마이', search: '검색',
    categories: '카테고리',
    // Home
    welcome: 'AM Mart에 오신 것을 환영합니다', hello: '안녕하세요',
    whatLooking: '오늘 무엇을 찾고 계신가요?',
    searchPlaceholder: '식료품, SIM 카드 검색...',
    shopByCategory: '카테고리별 쇼핑', seeAll: '전체 보기',
    featuredProducts: '추천 상품', popularItems: '인기 상품',
    bannerTitle: '매일 신선한 식료품',
    bannerSubtitle: '{threshold} 이상 주문 시 무료 배송',
    addMoreFree: '무료배송까지 {currency}{amount} 더 필요',
    // Services
    simCards: 'SIM 카드', topUp: '충전', myOrders: '내 주문',
    browseNumbers: '번호 찾기', localIntl: '국내 & 국제', trackDeliveries: '배송 추적',
    // Categories
    meatFish: '육류 & 생선', dairyMilk: '유제품 & 우유', bakery: '베이커리',
    riceGrains: '쌀 & 곡물', beverages: '음료', personalCare: '개인 위생',
    cleaning: '청소용품', snacks: '스낵',
    // Cart
    myCart: '장바구니', clearAll: '전체 삭제', subtotal: '소계',
    deliveryFee: '배송비', free: '무료', total: '합계',
    proceedCheckout: '결제하기', emptyCart: '장바구니가 비어있습니다',
    emptyCartSub: '상품을 추가해 주세요', startShopping: '쇼핑하기',
    // Profile
    myProfile: '마이페이지', myAddresses: '배송지 관리', myWallet: '내 지갑',
    wishlist: '찜 목록', notifications: '알림', support: '고객센터',
    termsPrivacy: '약관 및 개인정보처리방침', signOut: '로그아웃', language: '언어 설정',
    pushNotifications: '푸시 알림', guestUser: '비회원',
    signInToAccess: '로그인하고 프로필을 확인해보세요',
    signIn: '로그인', createAccount: '회원가입',
    myInformation: '내 정보', editProfileDetails: '프로필 수정',
    deliveryAddresses: '배송지 주소', savedItems: '찜한 상품',
    account: '계정 관리', settingsSupport: '설정 및 고객센터',
    ordersCount: '주문', wishlistCount: '찜', walletBalance: '지갑',
    // Orders
    myOrdersTitle: '내 주문', noOrdersYet: '주문 내역이 없습니다',
    orderHistoryEmpty: '주문 내역이 여기에 표시됩니다',
    statusAll: '전체', statusPending: '주문 접수', statusConfirmed: '확인 완료',
    statusDelivery: '배송 중', statusDelivered: '배송 완료', statusCancelled: '취소됨',
    buyAgain: '재주문', trackOrder: '배송 추적', orderDetails: '상세 보기',
    expectedBy: '배송 예정일', deliveredOn: '배송 완료',
    orderTotal: '합계',
    // Top-up
    mobileTopUp: '모바일 충전', localRecharge: '국내 (한국)',
    international: '해외 충전', selectCountry: '국가 선택',
    mobileOperator: '통신사', phoneToTopUp: '충전할 전화번호',
    selectAmount: '금액 선택', proceedPayment: '결제 진행',
    totalCharge: '총 결제금액', serviceFee: '서비스 수수료',
    exchangeRate: '환율', searchCountries: '국가 검색...',
    amountKRW: '금액 (₩ KRW)', topupSuccess: '충전이 완료되었습니다!',
    confirmTopUp: '충전 확인', payNow: '₩{amount} 결제하기',
    processingNote: '충전은 즉시 처리됩니다. 최대 24시간 소요될 수 있습니다.',
    viewHistory: '충전 내역 보기', topupHistory: '충전 내역',
    noHistory: '충전 내역이 없습니다',
    // Auth
    groceriesMore: '식료품 및 더 많은 것', fastDelivery: '빠른 배송',
    signInOTP: 'OTP로 로그인',
    // Products
    allProducts: '전체 상품', noProducts: '상품이 없습니다',
    searchProducts: '상품 검색...', sortBy: '정렬',
    tryDifferent: '다른 검색어나 카테고리를 시도해보세요',
    // Search screen
    recentSearches: '최근 검색어', browseCategories: '카테고리 탐색',
    popularSearches: '인기 검색어', searchProductsBrands: '상품, 브랜드 검색...',
    noResultsFor: '검색 결과 없음', tryDifferentKeyword: '다른 키워드나 카테고리를 시도해보세요',
    shop: '쇼핑',
    // Common
    loading: '로딩 중...', cancel: '취소', confirm: '확인',
    back: '뒤로', updating: '앱 업데이트 중...', version: 'AM Mart v1.0.0',
    comingSoon: '준비 중', appVersion: 'v1.0.0', paymentMethod: '결제 수단',
    wallet: 'AM Mart 지갑', creditCard: '신용 / 체크카드',
    priceBreakdown: '가격 상세', amountIn: '{currency} 금액',
    amountKRWLabel: '원화 금액',
    // Exchange Rates
    rateInquiry: '환율 조회', bestRates: '오늘의 최고 환율',
    compareRates: '환율 비교', sendCurrency: '보내는 통화',
    receiveCurrency: '받는 통화', sendAmount: '보내는 금액',
    receiveAmount: '받는 금액', transferFee: '이체 수수료',
    transferTime: '이체 시간', openApp: '앱 열기',
    openWebsite: '웹사이트 방문', verified: '인증됨',
    featured: '추천', noRatesAvailable: '이 통화쌍의 환율 정보가 없습니다',
    tryDifferentPair: '다른 통화쌍을 선택하거나 나중에 다시 확인하세요.',
    liveRates: '실시간 환율', rateLastUpdated: '업데이트',
    bestDeal: '최고 환율', comparisonTitle: '{send} {amount} 송금',
    rateSource: '출처', youReceive: '받는 금액',
    providerList: '모든 업체', loading: '로딩 중...',
    staleRate: '환율이 오래되었을 수 있습니다',
  },
};

export type TKey = keyof typeof translations.en;

interface LangCtx {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LangCtx>({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === 'en' || v === 'ko') setLangState(v);
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLangState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const t = (key: TKey, params?: Record<string, string | number>): string => {
    let text: string = translations[language][key] ?? translations.en[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
