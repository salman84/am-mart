import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator, Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { productApi, categoryApi, bannerApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';
import { useBranding } from '../../src/context/BrandingContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - 12) / 2;
const BANNER_HEIGHT = 180;

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

// ── Logo with HTTPS-only remote + bundled fallback ───────────────────────────
const LOCAL_LOGO = require('../../assets/splash-logo.png');

function LogoImage({ appLogo, style }: { appLogo: string; style: any }) {
  const [useFallback, setUseFallback] = React.useState(false);
  // Only try remote URL when it is a valid https:// link
  const isValidHttps = appLogo?.startsWith('https://');
  if (!useFallback && isValidHttps) {
    return (
      <Image
        source={{ uri: appLogo }}
        style={style}
        resizeMode="contain"
        onError={() => setUseFallback(true)}
      />
    );
  }
  return <Image source={LOCAL_LOGO} style={style} resizeMode="contain" />;
}

export default function HomeScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const cartCount = useSelector((state: RootState) => state.cart.itemCount);
  const featureTopup = useSelector((state: RootState) => (state.appSettings as any)?.featureTopup !== false);
  const featureSim = useSelector((state: RootState) => (state.appSettings as any)?.featureSim !== false);
  const { t } = useLanguage();
  const { appName, appLogo, currency } = useBranding();

  const [banners, setBanners]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured]     = useState<any[]>([]);
  const [popular, setPopular]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError]   = useState(false);

  // ── Hero Slider (fade transition, no swipe) ──────────────────
  const [heroIndex, setHeroIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroIndexRef = useRef(0);
  const heroBannersRef = useRef<any[]>([]);

  const startHeroSlide = useCallback((total: number) => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    if (total <= 1) return;
    heroTimerRef.current = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        heroIndexRef.current = (heroIndexRef.current + 1) % heroBannersRef.current.length;
        setHeroIndex(heroIndexRef.current);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 4000);
  }, [fadeAnim]);

  useEffect(() => {
    return () => { if (heroTimerRef.current) clearInterval(heroTimerRef.current); };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [bannersRes, categoriesRes, featuredRes, popularRes] = await Promise.allSettled([
        bannerApi.getActive(),
        categoryApi.getAll(),
        productApi.getFeatured(),
        productApi.getPopular(),
      ]);

      let bannerList: any[] = [];
      if (bannersRes.status === 'fulfilled') bannerList = bannersRes.value.data?.banners ?? bannersRes.value.data ?? [];
      if (bannerList.length === 0) bannerList = DEFAULT_BANNERS;
      heroBannersRef.current = bannerList;
      setBanners(bannerList);
      setHeroIndex(0);
      heroIndexRef.current = 0;
      fadeAnim.setValue(1);
      startHeroSlide(bannerList.length);

      if (categoriesRes.status === 'fulfilled') {
        const cats = categoriesRes.value.data?.categories ?? categoriesRes.value.data ?? [];
        setCategories(cats);
      }

      let featuredItems: any[] = [];
      let popularItems: any[] = [];

      if (featuredRes.status === 'fulfilled') {
        // backend returns plain array for featured/popular
        const d = featuredRes.value.data;
        featuredItems = Array.isArray(d) ? d : (d?.products ?? d?.data ?? []);
        setFeatured(featuredItems);
      }
      if (popularRes.status === 'fulfilled') {
        const d = popularRes.value.data;
        popularItems = Array.isArray(d) ? d : (d?.products ?? d?.data ?? []);
        setPopular(popularItems);
      }

      // Fallback: load all products when featured & popular both empty
      if (featuredItems.length === 0 && popularItems.length === 0) {
        try {
          const allRes = await productApi.getAll({ page: 1, limit: 12, status: 'ACTIVE' });
          const d = allRes.data;
          const allItems = Array.isArray(d) ? d : (d?.products ?? d?.data ?? []);
          if (allItems.length > 0) {
            setPopular(allItems);
            setLoadError(false);
          } else {
            setLoadError(true);
          }
        } catch {
          setLoadError(true);
        }
      } else {
        setLoadError(false);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startHeroSlide, fadeAnim]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Auto-retry silently after 5 s when load failed (covers brief network hiccups)
  useEffect(() => {
    if (!loadError) return;
    const t = setTimeout(() => { loadData(); }, 5000);
    return () => clearTimeout(t);
  }, [loadError, loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const displayBanners    = banners.length > 0 ? banners : DEFAULT_BANNERS;
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const currentBanner     = displayBanners[heroIndex] ?? displayBanners[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Logo — left */}
        <TouchableOpacity onPress={() => router.push('/(customer)/products' as any)} activeOpacity={0.8}>
          <LogoImage appLogo={appLogo} style={styles.headerLogo} />
        </TouchableOpacity>

        {/* Right icons */}
        <View style={styles.headerRight}>
          {/* Order history — only visible when logged in */}
          {user && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/(customer)/orders' as any)}
            >
              <Ionicons name="receipt-outline" size={23} color={Colors.text} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(customer)/notifications' as any)}>
            <Ionicons name="notifications-outline" size={23} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar (sticky, below header) ── */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.8}
        onPress={() => router.push('/(customer)/search' as any)}
      >
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <Text style={styles.searchPlaceholder}>{t('searchPlaceholder')}</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >

        {/* ── Hero Banner (single fade-transition slider) ── */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.heroBanner, { opacity: fadeAnim }]}>
            <TouchableOpacity
              activeOpacity={0.95}
              style={{ flex: 1 }}
              onPress={() => {
                if (currentBanner.linkType === 'CATEGORY' && currentBanner.linkUrl) {
                  router.push({ pathname: '/(customer)/products' as any, params: { categoryId: currentBanner.linkUrl } });
                } else if (currentBanner.linkType === 'PRODUCT' && currentBanner.linkUrl) {
                  router.push({ pathname: '/(customer)/product/[id]' as any, params: { id: currentBanner.linkUrl } });
                } else {
                  // Default: go to products page
                  router.push('/(customer)/products' as any);
                }
              }}
            >
              {currentBanner.imageUrl ? (
                <Image source={{ uri: currentBanner.imageUrl }} style={styles.heroBannerImage} resizeMode="cover" />
              ) : (
                <View style={[styles.heroBannerPlaceholder, { backgroundColor: BANNER_COLORS[heroIndex % BANNER_COLORS.length] }]}>
                  <View style={styles.bannerTextBox}>
                    <Text style={styles.bannerLabel}>{appName.toUpperCase()}</Text>
                    <Text style={styles.bannerTitle}>{currentBanner.title}</Text>
                    {currentBanner.subtitle ? <Text style={styles.bannerSubtitle}>{currentBanner.subtitle}</Text> : null}
                  </View>
                  <Ionicons name="storefront-outline" size={72} color="rgba(255,255,255,0.18)" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Dots */}
          {displayBanners.length > 1 && (
            <View style={styles.dotsRow}>
              {displayBanners.map((_, i) => (
                <View key={i} style={[styles.dot, i === heroIndex ? styles.dotActive : styles.dotInactive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Quick Services (TopUp, SIM, Rate Inquiry only) ── */}
        <View style={styles.servicesSection}>
          {[
            featureTopup && { icon: 'flash',          label: t('topUp'),       sub: t('localIntl'),     color: '#F97316', bg: '#FFF7ED', route: '/(customer)/topup' },
            featureSim   && { icon: 'phone-portrait', label: t('simCards'),    sub: t('browseNumbers'), color: '#3B82F6', bg: '#EFF6FF', route: '/(customer)/sim' },
                             { icon: 'trending-up',   label: t('rateInquiry'), sub: t('bestRates'),     color: '#10B981', bg: '#ECFDF5', route: '/(customer)/exchange-rates' },
          ].filter(Boolean).map((s: any) => (
            <TouchableOpacity key={s.label} style={styles.serviceCard} onPress={() => router.push(s.route as any)}>
              <View style={[styles.serviceIconBox, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon as any} size={24} color={s.color} />
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
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => <HProductCard product={item} currency={currency} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hProductRow}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews
            />
          </View>
        )}

        {/* ── Popular Products ── */}
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('popularItems')}</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/products' as any)}>
              <Text style={styles.seeAll}>{t('seeAll')}</Text>
            </TouchableOpacity>
          </View>
          {popular.length > 0 ? (
            <FlatList
              data={popular}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => <GridProductCard product={item} currency={currency} />}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              scrollEnabled={false}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={5}
              removeClippedSubviews
            />
          ) : loadError ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="wifi-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyProductsTitle}>Connection issue</Text>
              <Text style={styles.emptyProductsText}>Could not load products. Check your connection.</Text>
              <TouchableOpacity style={styles.shopNowBtn} onPress={() => { setLoadError(false); setLoading(true); loadData(); }}>
                <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
                <Text style={styles.shopNowText}>Tap to Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyProducts}>
              <Ionicons name="storefront-outline" size={48} color={Colors.textLight} />
              <Text style={styles.emptyProductsTitle}>{t('productsComingSoon')}</Text>
              <Text style={styles.emptyProductsText}>{t('checkBackLater')}</Text>
              <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/(customer)/products' as any)}>
                <Text style={styles.shopNowText}>{t('browseAllProducts')}</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Product Cards ─────────────────────────────────────────── */

const HProductCard = memo(function HProductCard({ product, currency }: { product: any; currency: string }) {
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
});

const GridProductCard = memo(function GridProductCard({ product, currency }: { product: any; currency: string }) {
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
});

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  productRow: { justifyContent: 'space-between', paddingHorizontal: Spacing.base },

  /* Header — logo left, icons right */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingLeft: 0, paddingRight: 12, paddingVertical: 8,
    backgroundColor: '#fff',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerLogo:  { height: 44, width: 120 },
  logoFallback: {
    height: 40, width: 40, borderRadius: 20,
    backgroundColor: '#000',
  },
  iconBtn:     { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },

  /* Search Bar — full width sticky like Coupang */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  searchPlaceholder: { fontSize: 14, color: '#9CA3AF', flex: 1 },

  /* Hero Banner */
  heroSection:        { backgroundColor: '#fff', paddingBottom: 12, marginBottom: 8 },
  heroBanner:         { marginHorizontal: Spacing.lg, marginTop: Spacing.base, height: BANNER_HEIGHT, borderRadius: 16, overflow: 'hidden', ...Shadow.md },
  heroBannerImage:    { width: '100%', height: '100%' },
  heroBannerPlaceholder: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: Spacing.xl,
  },
  bannerTextBox:  { flex: 1 },
  bannerLabel:    { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5, marginBottom: 4 },
  bannerTitle:    { color: '#fff', fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  bannerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs, marginTop: 4 },

  /* Dots */
  dotsRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 5 },
  dot:         { height: 6, borderRadius: 3 },
  dotActive:   { width: 20, backgroundColor: Colors.primary },
  dotInactive: { width: 6,  backgroundColor: '#D1D5DB' },

  /* Services */
  servicesSection: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: Spacing.base, paddingHorizontal: Spacing.lg,
    marginBottom: 8, gap: 8,
  },
  serviceCard:    { flex: 1, alignItems: 'center', gap: 5 },
  serviceIconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  serviceLabel:   { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  serviceDesc:    { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },

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

  /* Empty products placeholder */
  emptyProducts: {
    alignItems: 'center', paddingVertical: 36, paddingHorizontal: Spacing.lg,
  },
  emptyProductsTitle: { fontSize: 16, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 12, marginBottom: 4 },
  emptyProductsText:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  shopNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 9,
  },
  shopNowText: { fontSize: 13, fontWeight: FontWeight.semibold, color: Colors.primary },

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
