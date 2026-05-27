import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { productApi, categoryApi, bannerApi, appSettingsApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - 12) / 2;
const BANNER_WIDTH = width - Spacing.lg * 2;
const BANNER_INTERVAL = 4000; // 4 seconds auto-slide

// Category icon mapping — driven by name from API
const CAT_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  'Meat & Fish':        { icon: 'nutrition-outline',   color: '#EF4444', bg: '#FEF2F2' },
  'Meat & Seafood':     { icon: 'nutrition-outline',   color: '#EF4444', bg: '#FEF2F2' },
  'Dairy & Milk':       { icon: 'water-outline',        color: '#3B82F6', bg: '#EFF6FF' },
  'Dairy & Eggs':       { icon: 'water-outline',        color: '#3B82F6', bg: '#EFF6FF' },
  'Bakery':             { icon: 'cafe-outline',          color: '#F97316', bg: '#FFF7ED' },
  'Rice & Grains':      { icon: 'layers-outline',       color: '#A16207', bg: '#FEFCE8' },
  'Fruits & Vegetables':{ icon: 'leaf-outline',         color: '#22C55E', bg: '#F0FDF4' },
  'Beverages':          { icon: 'wine-outline',          color: '#8B5CF6', bg: '#F5F3FF' },
  'Personal Care':      { icon: 'body-outline',          color: '#EC4899', bg: '#FDF2F8' },
  'Cleaning':           { icon: 'sparkles-outline',      color: '#06B6D4', bg: '#ECFEFF' },
  'Household':          { icon: 'home-outline',          color: '#6366F1', bg: '#EEF2FF' },
  'Snacks':             { icon: 'fast-food-outline',     color: '#F59E0B', bg: '#FFFBEB' },
  'Frozen Food':        { icon: 'snow-outline',          color: '#60A5FA', bg: '#EFF6FF' },
  'Frozen Foods':       { icon: 'snow-outline',          color: '#60A5FA', bg: '#EFF6FF' },
  'International':      { icon: 'globe-outline',         color: '#10B981', bg: '#ECFDF5' },
};

const FALLBACK_ICONS = Object.values(CAT_ICONS);

function getCatStyle(name: string, index: number) {
  return CAT_ICONS[name] ?? FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

const BANNER_COLORS = ['#183522', '#1E3A5F', '#3B0764', '#7C2D12', '#164E63'];

export default function HomeScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const cartCount = useSelector((state: RootState) => state.cart.itemCount);
  const featureTopup = useSelector((state: RootState) => (state.appSettings as any)?.featureTopup !== false);
  const featureSim = useSelector((state: RootState) => (state.appSettings as any)?.featureSim !== false);
  const { t } = useLanguage();

  const [banners, setBanners]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured]     = useState<any[]>([]);
  const [popular, setPopular]       = useState<any[]>([]);
  const [appLogo, setAppLogo]       = useState<string | null>(null);
  const [appName, setAppName]       = useState('AM Mart');
  const [currency, setCurrency]     = useState('₩');
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Banner auto-slide
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoSlide = useCallback((total: number) => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    if (total <= 1) return;
    autoSlideRef.current = setInterval(() => {
      setActiveBanner((prev) => {
        const next = (prev + 1) % total;
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, BANNER_INTERVAL);
  }, []);

  useEffect(() => {
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [bannersRes, categoriesRes, featuredRes, popularRes, settingsRes] = await Promise.allSettled([
        bannerApi.getActive(),
        categoryApi.getAll(),
        productApi.getFeatured(),
        productApi.getPopular(),
        appSettingsApi.getPublic(),
      ]);

      let bannerList: any[] = [];
      if (bannersRes.status === 'fulfilled') bannerList = bannersRes.value.data?.banners ?? bannersRes.value.data ?? [];
      setBanners(bannerList);
      startAutoSlide(bannerList.length);

      if (categoriesRes.status === 'fulfilled') {
        const cats = categoriesRes.value.data?.categories ?? categoriesRes.value.data ?? [];
        setCategories(cats);
      }
      if (featuredRes.status === 'fulfilled') {
        const items = featuredRes.value.data?.products ?? featuredRes.value.data ?? [];
        setFeatured(items);
      }
      if (popularRes.status === 'fulfilled') {
        const items = popularRes.value.data?.products ?? popularRes.value.data ?? [];
        setPopular(items);
      }
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data;
        if (s?.APP_LOGO) setAppLogo(s.APP_LOGO);
        if (s?.APP_NAME) setAppName(s.APP_NAME);
        if (s?.CURRENCY_SYMBOL) setCurrency(s.CURRENCY_SYMBOL);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startAutoSlide]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const displayBanners    = banners.length > 0 ? banners : DEFAULT_BANNERS;
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const displayPopular    = popular.length > 0 ? popular : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(customer)/products' as any)} activeOpacity={0.8}>
          {appLogo ? (
            <Image source={{ uri: appLogo }} style={styles.headerLogo} resizeMode="contain" />
          ) : (
            <Image source={require('../../assets/AM-Logo.jpeg')} style={styles.headerLogo} resizeMode="contain" />
          )}
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {/* Watch History — replaces top cart */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(customer)/search' as any)}
          >
            <Ionicons name="time-outline" size={23} color={Colors.text} />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/(customer)/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={23} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >

        {/* ── Banner Auto-Slider ── */}
        <View style={styles.bannerSection}>
          <FlatList
            ref={bannerRef}
            data={displayBanners}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_WIDTH + 12}
            decelerationRate="fast"
            keyExtractor={(_, i) => `banner-${i}`}
            contentContainerStyle={styles.bannerContent}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12));
              setActiveBanner(idx);
            }}
            onScrollBeginDrag={() => {
              if (autoSlideRef.current) clearInterval(autoSlideRef.current);
            }}
            onScrollEndDrag={() => startAutoSlide(displayBanners.length)}
            getItemLayout={(_, index) => ({ length: BANNER_WIDTH + 12, offset: (BANNER_WIDTH + 12) * index, index })}
            renderItem={({ item: banner, index }) => (
              <TouchableOpacity
                style={styles.bannerItem}
                activeOpacity={0.95}
                onPress={() => {
                  if (banner.linkType === 'CATEGORY' && banner.linkUrl) {
                    router.push({ pathname: '/(customer)/products' as any, params: { categoryId: banner.linkUrl } });
                  } else if (banner.linkType === 'PRODUCT' && banner.linkUrl) {
                    router.push({ pathname: '/(customer)/product/[id]' as any, params: { id: banner.linkUrl } });
                  }
                }}
              >
                {banner.imageUrl ? (
                  <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.bannerPlaceholder, { backgroundColor: BANNER_COLORS[index % BANNER_COLORS.length] }]}>
                    <View style={styles.bannerTextBox}>
                      <Text style={styles.bannerLabel}>{appName.toUpperCase()}</Text>
                      <Text style={styles.bannerTitle}>{banner.title}</Text>
                      {banner.subtitle ? <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text> : null}
                    </View>
                    <Ionicons name="storefront-outline" size={64} color="rgba(255,255,255,0.18)" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />

          {/* Dots indicator */}
          {displayBanners.length > 1 && (
            <View style={styles.dotsRow}>
              {displayBanners.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === activeBanner ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Quick Services ── */}
        <View style={styles.servicesSection}>
          {[
            featureTopup && { icon: 'flash',          label: t('topUp'),      sub: t('localIntl'),       color: '#F97316', bg: '#FFF7ED', route: '/(customer)/topup'           },
            featureSim   && { icon: 'phone-portrait', label: t('simCards'),   sub: t('browseNumbers'),   color: '#3B82F6', bg: '#EFF6FF', route: '/(customer)/sim'              },
                             { icon: 'trending-up',    label: t('rateInquiry'), sub: t('bestRates'),      color: '#10B981', bg: '#ECFDF5', route: '/(customer)/exchange-rates'  },
                             { icon: 'receipt',        label: t('myOrders'),   sub: t('trackDeliveries'), color: '#6366F1', bg: '#EEF2FF', route: '/(customer)/orders'           },
                             { icon: 'storefront',     label: t('shop'),       sub: t('allProducts'),     color: '#8B5CF6', bg: '#F5F3FF', route: '/(customer)/products'         },
          ].filter(Boolean).map((s: any) => (
            <TouchableOpacity key={s.label} style={styles.serviceCard} onPress={() => router.push(s.route as any)}>
              <View style={[styles.serviceIconBox, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={22} color={s.color} />
              </View>
              <Text style={styles.serviceLabel}>{s.label}</Text>
              <Text style={styles.serviceDesc} numberOfLines={1}>{s.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Categories ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('shopByCategory')}</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/categories' as any)}>
              <Text style={styles.seeAll}>{t('seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {displayCategories.slice(0, 10).map((cat: any, i: number) => {
              const st = getCatStyle(cat.name, i);
              return (
                <TouchableOpacity
                  key={cat.id || i}
                  style={styles.categoryItem}
                  onPress={() => router.push({ pathname: '/(customer)/products' as any, params: { categoryId: cat.id, categoryName: cat.name } })}
                >
                  <View style={[styles.categoryIconBox, { backgroundColor: st.bg }]}>
                    {cat.image
                      ? <Image source={{ uri: cat.image }} style={styles.categoryImg} resizeMode="cover" />
                      : <Ionicons name={st.icon} size={26} color={st.color} />
                    }
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Featured Products ── */}
        {featured.length > 0 && (
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('featuredProducts')}</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(customer)/products' as any, params: { featured: 'true' } })}>
                <Text style={styles.seeAll}>{t('seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hProductRow}>
              {featured.map((p: any) => <HProductCard key={p.id} product={p} currency={currency} />)}
            </ScrollView>
          </View>
        )}

        {/* ── Popular Products ── */}
        {displayPopular.length > 0 && (
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('popularItems')}</Text>
              <TouchableOpacity onPress={() => router.push('/(customer)/products' as any)}>
                <Text style={styles.seeAll}>{t('seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productGrid}>
              {displayPopular.map((p: any) => <GridProductCard key={p.id} product={p} currency={currency} />)}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Product Cards ─────────────────────────────────────────── */

function HProductCard({ product, currency }: { product: any; currency: string }) {
  const price = product.discountPrice ?? product.price;
  const image = product.images?.[0]?.url;
  const discountPct = product.discountPrice
    ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.hCard}
      onPress={() => router.push({ pathname: '/(customer)/product/[id]' as any, params: { id: product.id } })}
    >
      <View style={styles.hCardImage}>
        {image
          ? <Image source={{ uri: image }} style={styles.hImg} resizeMode="cover" />
          : <View style={styles.imgPlaceholder}><Ionicons name="image-outline" size={28} color={Colors.textLight} /></View>
        }
        {discountPct > 0 && (
          <View style={styles.discountBadge}><Text style={styles.discountText}>-{discountPct}%</Text></View>
        )}
      </View>
      <View style={styles.hCardInfo}>
        <Text style={styles.hName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.hStore} numberOfLines={1}>{product.seller?.storeName || ''}</Text>
        <View style={styles.priceRow}>
          {product.discountPrice && (
            <Text style={styles.originalPrice}>{currency}{product.price?.toLocaleString()}</Text>
          )}
          <Text style={styles.price}>{currency}{price?.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function GridProductCard({ product, currency }: { product: any; currency: string }) {
  const price = product.discountPrice ?? product.price;
  const image = product.images?.[0]?.url;
  const discountPct = product.discountPrice
    ? Math.round((1 - product.discountPrice / product.price) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.gridCard}
      onPress={() => router.push({ pathname: '/(customer)/product/[id]' as any, params: { id: product.id } })}
    >
      <View style={styles.gridImage}>
        {image
          ? <Image source={{ uri: image }} style={styles.gridImg} resizeMode="cover" />
          : <View style={styles.imgPlaceholder}><Ionicons name="image-outline" size={32} color={Colors.textLight} /></View>
        }
        {discountPct > 0 && (
          <View style={styles.discountBadge}><Text style={styles.discountText}>-{discountPct}%</Text></View>
        )}
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.gridStore} numberOfLines={1}>{product.seller?.storeName || ''}</Text>
        <View style={styles.priceRow}>
          {product.discountPrice && (
            <Text style={styles.originalPrice}>{currency}{product.price?.toLocaleString()}</Text>
          )}
          <Text style={styles.price}>{currency}{(price || 0).toLocaleString()}</Text>
        </View>
        {product.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── Fallback data (used when API returns nothing) ──────────── */

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Fruits & Vegetables' },
  { id: '2', name: 'Meat & Seafood' },
  { id: '3', name: 'Dairy & Eggs' },
  { id: '4', name: 'Bakery' },
  { id: '5', name: 'Beverages' },
  { id: '6', name: 'Snacks' },
  { id: '7', name: 'Personal Care' },
  { id: '8', name: 'Household' },
];

const DEFAULT_BANNERS = [
  { id: '1', title: 'Quality Groceries', subtitle: 'Delivered to your door' },
  { id: '2', title: 'International Topup', subtitle: 'Send credit worldwide' },
];

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerLogo: { height: 40, width: 130 },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },

  /* Banner */
  bannerSection:    { backgroundColor: '#fff', paddingBottom: 10, marginBottom: 8 },
  bannerContent:    { paddingHorizontal: Spacing.lg, gap: 12, paddingTop: Spacing.base },
  bannerItem: {
    width: BANNER_WIDTH, height: 160,
    borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadow.md,
  },
  bannerImage:      { width: '100%', height: '100%' },
  bannerPlaceholder:{
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.xl,
  },
  bannerTextBox:    { flex: 1 },
  bannerLabel:      { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, marginBottom: 4 },
  bannerTitle:      { color: '#fff', fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  bannerSubtitle:   { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs, marginTop: 4 },

  /* Dots */
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 5 },
  dot:     { height: 6, borderRadius: 3 },
  dotActive:   { width: 20, backgroundColor: Colors.primary },
  dotInactive: { width: 6,  backgroundColor: '#D1D5DB' },

  /* Services */
  servicesSection: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: Spacing.base, paddingHorizontal: Spacing.base,
    marginBottom: 8, gap: 6,
  },
  serviceCard:    { flex: 1, alignItems: 'center', gap: 4 },
  serviceIconBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  serviceLabel:   { fontSize: 11, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  serviceDesc:    { fontSize: 9, color: Colors.textSecondary, textAlign: 'center' },

  /* Sections */
  sectionBox: { backgroundColor: '#fff', marginBottom: 8, paddingBottom: Spacing.base },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: 10,
  },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  seeAll:       { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },

  /* Categories */
  categoryRow: { paddingHorizontal: Spacing.lg, gap: 14 },
  categoryItem: { alignItems: 'center', width: 62 },
  categoryIconBox: {
    width: 54, height: 54, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  categoryImg:  { width: '100%', height: '100%' },
  categoryName: { fontSize: 10, color: Colors.text, textAlign: 'center', lineHeight: 13, fontWeight: FontWeight.medium },

  /* Horizontal product cards */
  hProductRow: { paddingHorizontal: Spacing.lg, gap: 10 },
  hCard: { width: 148, backgroundColor: '#fff', borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  hCardImage: { height: 110, backgroundColor: '#F5F5F5' },
  hImg:        { width: '100%', height: '100%' },
  hCardInfo:   { padding: Spacing.sm },
  hName:       { fontSize: 11, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 15 },
  hStore:      { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },

  /* Grid product cards */
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 10 },
  gridCard: {
    width: CARD_WIDTH, backgroundColor: '#fff',
    borderRadius: BorderRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  gridImage: { height: 130, backgroundColor: '#F5F5F5' },
  gridImg:   { width: '100%', height: '100%' },
  gridInfo:  { padding: Spacing.sm, gap: 2 },
  gridName:  { fontSize: 12, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 16 },
  gridStore: { fontSize: 10, color: Colors.textSecondary },

  /* Shared */
  imgPlaceholder:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  discountBadge:   { position: 'absolute', top: 6, left: 6, backgroundColor: Colors.danger, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  discountText:    { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },
  priceRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  originalPrice:   { fontSize: 10, color: Colors.textLight, textDecorationLine: 'line-through' },
  price:           { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.primary },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  ratingText:      { fontSize: 10, color: Colors.textSecondary },
});
