import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, Share, Modal, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../src/store';
import { productApi, cartApi, reviewsApi } from '../../../src/services/api';
import { fetchCart } from '../../../src/store/slices/cartSlice';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../../src/i18n';

const { width } = Dimensions.get('window');
const GALLERY_HEIGHT = 300;
const LOW_STOCK_THRESHOLD = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Stars component
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.floor(rating) ? 'star' : s - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full-screen image viewer (Modal)
// ─────────────────────────────────────────────────────────────────────────────
function FullScreenViewer({
  images,
  initialIdx,
  onClose,
}: {
  images: { url: string }[];
  initialIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIdx);
  const flatRef = useRef<FlatList>(null);
  const topInsets = useSafeAreaInsets();

  // Scroll to the tapped image once the list renders
  useEffect(() => {
    if (initialIdx > 0) {
      const t = setTimeout(() => {
        flatRef.current?.scrollToIndex({ index: initialIdx, animated: false });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [initialIdx]);

  return (
    <Modal visible animationType="fade" statusBarTranslucent transparent={false}>
      <View style={fsSt.root}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

        {/* Fixed header: back + counter */}
        <View style={[fsSt.header, { paddingTop: topInsets.top + 4 }]}>
          <TouchableOpacity onPress={onClose} style={fsSt.closeBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={fsSt.counter}>{idx + 1} / {images.length}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Swipeable full-resolution images */}
        <FlatList
          ref={flatRef}
          data={images}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIdx}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScroll={(e) => {
            const newIdx = Math.round(e.nativeEvent.contentOffset.x / width);
            if (newIdx !== idx) setIdx(newIdx);
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image
                source={{ uri: item.url }}
                style={{ width, height: width * 1.3 }}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Dots indicator */}
        {images.length > 1 && (
          <View style={fsSt.dotsRow}>
            {images.map((_, i) => (
              <View key={i} style={[fsSt.dot, i === idx && fsSt.dotActive]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const fsSt = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#000' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, zIndex: 10 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  counter:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  dotsRow:  { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 24 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive:{ width: 20, backgroundColor: '#fff' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Image gallery with swipe + dots — tap to open full-screen
// ─────────────────────────────────────────────────────────────────────────────
function ImageGallery({
  images,
  onImagePress,
}: {
  images: { url: string; alt?: string }[];
  onImagePress: (idx: number) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);

  if (!images || images.length === 0) {
    return (
      <View style={galSt.placeholder}>
        <Ionicons name="image-outline" size={80} color={Colors.borderLight} />
      </View>
    );
  }

  return (
    <View style={{ height: GALLERY_HEIGHT }}>
      <FlatList
        ref={flatRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          // Tap → open full-screen viewer
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => onImagePress(index)}
            style={galSt.imgTouch}
          >
            <Image source={{ uri: item.url }} style={galSt.img} resizeMode="cover" />
          </TouchableOpacity>
        )}
      />
      {/* Dots */}
      {images.length > 1 && (
        <View style={galSt.dotsRow}>
          {images.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => { flatRef.current?.scrollToIndex({ index: i, animated: true }); setActiveIdx(i); }}
              style={[galSt.dot, i === activeIdx && galSt.dotActive]}
            />
          ))}
        </View>
      )}
      {/* Counter */}
      {images.length > 1 && (
        <View style={galSt.counter}>
          <Text style={galSt.counterTxt}>{activeIdx + 1}/{images.length}</Text>
        </View>
      )}
    </View>
  );
}

const galSt = StyleSheet.create({
  placeholder: { height: GALLERY_HEIGHT, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  imgTouch:    { width, height: GALLERY_HEIGHT },
  img:         { width, height: GALLERY_HEIGHT, backgroundColor: Colors.surface },
  dotsRow:     { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:   { backgroundColor: '#fff', width: 20 },
  counter:     { position: 'absolute', bottom: 14, right: 16, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  counterTxt:  { color: '#fff', fontSize: 11, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Star breakdown bar
// ─────────────────────────────────────────────────────────────────────────────
function RatingBreakdown({ reviews }: { reviews: any[] }) {
  if (!reviews || reviews.length === 0) return null;
  const total = reviews.length;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / total;

  return (
    <View style={rbSt.wrap}>
      <View style={rbSt.avgCol}>
        <Text style={rbSt.avgNum}>{avg.toFixed(1)}</Text>
        <Stars rating={avg} size={16} />
        <Text style={rbSt.avgSub}>{total} {total === 1 ? 'review' : 'reviews'}</Text>
      </View>
      <View style={rbSt.barsCol}>
        {counts.map(({ star, count }) => {
          const pct = total > 0 ? count / total : 0;
          return (
            <View key={star} style={rbSt.barRow}>
              <Text style={rbSt.starLabel}>{star}</Text>
              <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 4 }} />
              <View style={rbSt.barBg}>
                <View style={[rbSt.barFill, { width: `${pct * 100}%` }]} />
              </View>
              <Text style={rbSt.pctLabel}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const rbSt = StyleSheet.create({
  wrap:     { flexDirection: 'row', gap: 16, paddingBottom: Spacing.base },
  avgCol:   { alignItems: 'center', justifyContent: 'center', width: 80, gap: 4 },
  avgNum:   { fontSize: 40, fontWeight: FontWeight.extrabold, color: Colors.text, lineHeight: 44 },
  avgSub:   { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  barsCol:  { flex: 1, gap: 6, justifyContent: 'center' },
  barRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starLabel:{ fontSize: 12, color: Colors.textSecondary, width: 10, textAlign: 'right' },
  barBg:    { flex: 1, height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  pctLabel: { fontSize: 11, color: Colors.textSecondary, width: 22, textAlign: 'right' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Single review card
// ─────────────────────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: any }) {
  const name = review.customer?.user?.fullName || review.customer?.fullName || 'Customer';
  const initial = name[0]?.toUpperCase() || 'C';
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return (
    <View style={rvSt.card}>
      <View style={rvSt.header}>
        <View style={rvSt.avatar}>
          <Text style={rvSt.avatarTxt}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rvSt.name}>{name.split(' ')[0]}</Text>
          <Stars rating={review.rating} size={12} />
        </View>
        {date ? <Text style={rvSt.date}>{date}</Text> : null}
      </View>
      {review.comment ? <Text style={rvSt.comment}>{review.comment}</Text> : null}
      {review.images?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {review.images.map((img: string, i: number) => (
            <Image key={i} source={{ uri: img }} style={rvSt.reviewImg} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const rvSt = StyleSheet.create({
  card:      { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  header:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  avatar:    { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  name:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  date:      { fontSize: FontSize.xs, color: Colors.textLight },
  comment:   { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginLeft: 44 },
  reviewImg: { width: 72, height: 72, borderRadius: 8, marginRight: 8, backgroundColor: Colors.surface },
});

// ─────────────────────────────────────────────────────────────────────────────
// Related product card
// ─────────────────────────────────────────────────────────────────────────────
function RelatedCard({ item, currency }: { item: any; currency: string }) {
  const imageUrl = item.images?.[0]?.url;
  const hasDiscount = item.discountPrice && item.discountPrice < item.price;
  const displayPrice = hasDiscount ? item.discountPrice : item.price;
  const discountPct = hasDiscount
    ? (item.discountPercent || Math.round((1 - item.discountPrice / item.price) * 100))
    : null;

  return (
    <TouchableOpacity
      style={relSt.card}
      onPress={() => router.push({ pathname: '/(customer)/product/[id]', params: { id: item.id } } as any)}
      activeOpacity={0.85}
    >
      <View style={relSt.imgWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={relSt.img} resizeMode="cover" />
        ) : (
          <View style={relSt.imgFallback}>
            <Ionicons name="cube-outline" size={28} color={Colors.textLight} />
          </View>
        )}
        {discountPct ? (
          <View style={relSt.badge}>
            <Text style={relSt.badgeTxt}>-{discountPct}%</Text>
          </View>
        ) : null}
      </View>
      <View style={relSt.info}>
        <Text style={relSt.name} numberOfLines={2}>{item.name}</Text>
        <Text style={relSt.price}>{currency}{displayPrice?.toLocaleString()}</Text>
        {hasDiscount && (
          <Text style={relSt.orig}>{currency}{item.price?.toLocaleString()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const relSt = StyleSheet.create({
  card:       { width: 140, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.sm },
  imgWrap:    { width: 140, height: 130, backgroundColor: Colors.background, position: 'relative' },
  img:        { width: 140, height: 130 },
  imgFallback:{ width: 140, height: 130, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  badge:      { position: 'absolute', top: 6, left: 6, backgroundColor: Colors.danger, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTxt:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  info:       { padding: 8 },
  name:       { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 16, marginBottom: 4 },
  price:      { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.text },
  orig:       { fontSize: FontSize.xs, color: Colors.textLight, textDecorationLine: 'line-through' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Product info table row
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();

  const currency        = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
  const deliveryFeeGlob = useSelector((state: RootState) => (state.appSettings as any)?.deliveryFee     || 0);
  const freeThreshold   = useSelector((state: RootState) => (state.appSettings as any)?.freeDeliveryThreshold || 50000);
  const authUser        = useSelector((state: RootState) => state.auth.user);

  const [product, setProduct]               = useState<any>(null);
  const [related, setRelated]               = useState<any[]>([]);
  const [reviews, setReviews]               = useState<any[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [quantity, setQuantity]             = useState(1);
  const [addingToCart, setAddingToCart]     = useState(false);
  const [wishlisted, setWishlisted]         = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Full-screen image viewer: null = closed, number = open at that index
  const [fullScreenIdx, setFullScreenIdx]   = useState<number | null>(null);

  // Only re-render when the header needs to flip solid ↔ transparent
  const [headerSolid, setHeaderSolid]       = useState(false);
  const headerSolidRef                      = useRef(false);

  // ── Load product + related + reviews in parallel ──────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [productRes, relatedRes, reviewsRes] = await Promise.allSettled([
        productApi.getOne(id),
        productApi.getRelated(id),
        reviewsApi.getProductReviews(id),
      ]);

      if (productRes.status === 'fulfilled') setProduct(productRes.value.data);
      if (relatedRes.status === 'fulfilled') {
        const data = relatedRes.value.data;
        setRelated(Array.isArray(data) ? data : []);
      }
      if (reviewsRes.status === 'fulfilled') {
        const data = reviewsRes.value.data;
        setReviews(Array.isArray(data) ? data : (data?.reviews || []));
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Load initial wishlist state for CUSTOMER users ────────────────────────
  useEffect(() => {
    if (authUser?.role === 'CUSTOMER' && id) {
      productApi.getWishlist()
        .then((res) => {
          const items: any[] = res.data || [];
          const found = items.some((item) => item.productId === id || item.product?.id === id);
          setWishlisted(found);
        })
        .catch(() => { /* ignore — wishlist is optional */ });
    }
  }, [authUser, id]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const hasDiscount  = !!(product?.discountPrice && product.discountPrice < product.price);
  const displayPrice = hasDiscount ? product?.discountPrice : product?.price;
  const originalPrice= hasDiscount ? product?.price : null;
  const discountPct  = hasDiscount
    ? (product.discountPercent || Math.round((1 - product.discountPrice / product.price) * 100))
    : null;

  const isOutOfStock = product?.stock === 0;
  const isLowStock   = !isOutOfStock && product?.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
  const maxQty       = Math.min(product?.stock || 1, product?.maxOrderQty || 999);
  const minQty       = product?.minOrderQty || 1;

  const productDeliveryFee = product?.deliveryFee ?? deliveryFeeGlob;
  const isFreeDelivery     = product?.isDeliveryAvailable && productDeliveryFee === 0;
  const total              = (displayPrice || 0) * quantity;

  const images: any[] = product?.images?.length ? product.images : [];
  const tags: string[] = product?.tags || [];

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const requireAuth = () => {
    if (!authUser) { router.push('/(auth)/login' as any); return false; }
    return true;
  };

  const handleAddToCart = async () => {
    if (!requireAuth()) return;
    setAddingToCart(true);
    try {
      await cartApi.addItem({ productId: id, quantity });
      dispatch(fetchCart() as any);
      Toast.show({ type: 'success', text1: t('addedToCart'), text2: `${product.name} × ${quantity}` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedToAdd') });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!requireAuth()) return;
    setAddingToCart(true);
    try {
      await cartApi.addItem({ productId: id, quantity });
      dispatch(fetchCart() as any);
      router.push('/(customer)/checkout' as any);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedToAdd') });
      setAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
    if (!requireAuth()) return;
    // Wishlist is only for customers
    if (authUser?.role !== 'CUSTOMER') {
      Toast.show({ type: 'info', text1: 'Wishlist is for customer accounts' });
      return;
    }
    setWishlistLoading(true);
    try {
      const res = await productApi.toggleWishlist(id);
      const now = res.data?.wishlisted ?? !wishlisted;
      setWishlisted(now);
      Toast.show({ type: 'success', text1: now ? t('addedToWishlist') : t('removedFromWishlist') });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Could not update wishlist' });
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      const priceText = hasDiscount
        ? `${currency}${displayPrice?.toLocaleString()} (was ${currency}${originalPrice?.toLocaleString()})`
        : `${currency}${displayPrice?.toLocaleString()}`;
      const deepLink = `ammart://product/${id}`;
      const message = [
        product.name,
        priceText,
        product.description ? product.description.slice(0, 100) : '',
        `\nView in AM Mart: ${deepLink}`,
      ].filter(Boolean).join('\n');
      await Share.share({ title: product.name, message });
    } catch (_) { /* user cancelled */ }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingCon}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.loadingCon}>
          <Ionicons name="cube-outline" size={60} color={Colors.textLight} />
          <Text style={styles.notFoundTxt}>{t('productNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Full-screen image viewer Modal ── */}
      {fullScreenIdx !== null && (
        <FullScreenViewer
          images={images}
          initialIdx={fullScreenIdx}
          onClose={() => setFullScreenIdx(null)}
        />
      )}

      {/* ── Back button — top-left always. Solid bg when scrolled past gallery ── */}
      <SafeAreaView
        edges={['top']}
        style={[styles.floatingHeader, headerSolid && styles.floatingHeaderSolid]}
      >
        <View style={[styles.headerRow, headerSolid && styles.headerRowSolid]}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          {/* Product name only visible when solid (scrolled past image) */}
          {headerSolid && (
            <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
          )}
          {/* Spacer to push back button to the left when name is hidden */}
          {!headerSolid && <View style={{ flex: 1 }} />}
        </View>
      </SafeAreaView>

      {/* ── Share / Like / Cart — ALWAYS fixed at image bottom, NEVER at top ── */}
      <View style={styles.imageActionsOverlay}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={handleWishlist} disabled={wishlistLoading}>
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={22}
            color={wishlisted ? Colors.danger : Colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/(customer)/product/cart' as any)}>
          <Ionicons name="cart-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const solid = e.nativeEvent.contentOffset.y > GALLERY_HEIGHT - 60;
          if (solid !== headerSolidRef.current) {
            headerSolidRef.current = solid;
            setHeaderSolid(solid);
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Image gallery */}
        <ImageGallery
          images={images}
          onImagePress={(idx) => setFullScreenIdx(idx)}
        />

        {/* Main info card */}
        <View style={styles.infoCard}>
          {/* Badges */}
          <View style={styles.badgesRow}>
            {product.category && (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeTxt}>{product.category.name}</Text>
              </View>
            )}
            {isOutOfStock && (
              <View style={[styles.urgBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.urgTxt, { color: Colors.danger }]}>{t('outOfStock')}</Text>
              </View>
            )}
            {isLowStock && (
              <View style={[styles.urgBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="flash" size={11} color="#D97706" />
                <Text style={[styles.urgTxt, { color: '#D97706' }]}>
                  {t('onlyNLeft').replace('{count}', String(product.stock))}
                </Text>
              </View>
            )}
            {product.isFeatured && (
              <View style={[styles.urgBadge, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="ribbon" size={11} color={Colors.primary} />
                <Text style={[styles.urgTxt, { color: Colors.primary }]}>Featured</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.productName}>{product.name}</Text>
          {product.nameKr ? <Text style={styles.productNameSub}>{product.nameKr}</Text> : null}

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <Stars rating={product.rating || 0} size={14} />
            <Text style={styles.ratingVal}>{(product.rating || 0).toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({product.reviewCount || 0} {t('reviews').toLowerCase()})</Text>
            {product.viewCount > 0 && (
              <>
                <Text style={styles.ratingDiv}>·</Text>
                <Text style={styles.soldCnt}>{t('soldCount').replace('{count}', product.viewCount.toLocaleString())}</Text>
              </>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <View style={styles.priceLeft}>
              <Text style={styles.mainPrice}>{currency}{displayPrice?.toLocaleString()}</Text>
              {originalPrice && (
                <Text style={styles.origPrice}>{currency}{originalPrice.toLocaleString()}</Text>
              )}
            </View>
            {discountPct ? (
              <View style={styles.discBadge}>
                <Text style={styles.discTxt}>-{discountPct}%</Text>
              </View>
            ) : null}
          </View>

          {/* Delivery */}
          <View style={styles.delivRow}>
            <Ionicons name="car-outline" size={15} color={isFreeDelivery ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.delivTxt, isFreeDelivery && { color: Colors.primary, fontWeight: FontWeight.bold }]}>
              {isFreeDelivery
                ? t('freeDelivery')
                : t('deliveryFeeLabel').replace('{fee}', `${currency}${productDeliveryFee?.toLocaleString()}`)}
            </Text>
            {!isFreeDelivery && freeThreshold > 0 && (
              <Text style={styles.delivNote}>
                {' · '}{t('freeDelivery').toLowerCase()} over {currency}{freeThreshold.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.tagsRow}>
              {tags.map((tag, i) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagTxt}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quantity */}
        <View style={styles.sectionCard}>
          <View style={styles.qtyRow}>
            <Text style={styles.sectionTitle}>{t('quantityLabel')}</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= minQty && styles.qtyBtnDis]}
                onPress={() => setQuantity((q) => Math.max(minQty, q - 1))}
                disabled={quantity <= minQty}
              >
                <Ionicons name="remove" size={18} color={quantity <= minQty ? Colors.textLight : Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, (quantity >= maxQty || isOutOfStock) && styles.qtyBtnDis]}
                onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty || isOutOfStock}
              >
                <Ionicons name="add" size={18} color={(quantity >= maxQty || isOutOfStock) ? Colors.textLight : Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          {(product.minOrderQty > 1 || product.maxOrderQty) && (
            <View style={styles.qtyHints}>
              {product.minOrderQty > 1 && <Text style={styles.qtyHint}>{t('minOrderLabel')}: {product.minOrderQty}</Text>}
              {product.maxOrderQty   && <Text style={styles.qtyHint}>{t('maxOrderLabel')}: {product.maxOrderQty}</Text>}
            </View>
          )}
        </View>

        {/* Product info table */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('productInfo')}</Text>
          <View style={styles.infoTable}>
            <InfoRow
              label={t('stockLabel')}
              value={isOutOfStock ? t('outOfStock') : t('stockAvailable').replace('{count}', String(product.stock))}
              valueColor={isOutOfStock ? Colors.danger : Colors.primary}
            />
            <InfoRow label={t('unitLabel')} value={product.unit || 'pcs'} />
            {product.weight          && <InfoRow label="Weight / Size"     value={product.weight} />}
            {product.brand           && <InfoRow label="Brand"             value={product.brand} />}
            {product.countryOfOrigin && <InfoRow label="Country of Origin" value={product.countryOfOrigin} />}
            {product.sku             && <InfoRow label={t('skuLabel')}     value={product.sku} />}
          </View>
        </View>

        {/* Description */}
        {product.description ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('description')}</Text>
            <Text style={styles.descTxt}>{product.description}</Text>
          </View>
        ) : null}

        {/* Seller info */}
        {product.seller && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('sellerInfo')}</Text>
            <View style={styles.sellerRow}>
              {product.seller.storeLogo ? (
                <Image source={{ uri: product.seller.storeLogo }} style={styles.sellerLogo} resizeMode="cover" />
              ) : (
                <View style={styles.sellerLogoFb}>
                  <Ionicons name="storefront" size={22} color={Colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{product.seller.storeName}</Text>
                {product.seller.rating > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Stars rating={product.seller.rating} size={12} />
                    <Text style={styles.sellerRatTxt}>{product.seller.rating.toFixed(1)}</Text>
                  </View>
                )}
                {product.seller.totalSales > 0 && (
                  <Text style={styles.sellerSales}>{t('soldCount').replace('{count}', product.seller.totalSales.toLocaleString())}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </View>
          </View>
        )}

        {/* Customer Reviews */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('customerReviews')}</Text>
          {reviews.length > 0 ? (
            <>
              <RatingBreakdown reviews={reviews} />
              {visibleReviews.map((rev, i) => <ReviewCard key={rev.id || i} review={rev} />)}
              {reviews.length > 3 && (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllReviews((v) => !v)}>
                  <Text style={styles.showMoreTxt}>
                    {showAllReviews ? 'Show less' : `See all ${reviews.length} reviews`}
                  </Text>
                  <Ionicons name={showAllReviews ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noReviews}>
              <Ionicons name="star-outline" size={36} color={Colors.textLight} />
              <Text style={styles.noReviewsTxt}>{t('noFirstReview')}</Text>
            </View>
          )}
        </View>

        {/* Related Products */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.lg, paddingTop: Spacing.base }]}>
              {t('relatedProducts')}
            </Text>
            <FlatList
              data={related}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}
              ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
              renderItem={({ item }) => <RelatedCard item={item} currency={currency} />}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Sticky bottom bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.totalCol}>
          <Text style={styles.totalLbl}>{t('total')}</Text>
          <Text style={styles.totalPrice}>{currency}{total.toLocaleString()}</Text>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[styles.cartBtn, (isOutOfStock || addingToCart) && styles.btnDis]}
            onPress={handleAddToCart}
            disabled={isOutOfStock || addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="cart-outline" size={18} color={Colors.primary} />
                <Text style={styles.cartBtnTxt}>{t('addToCart')}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buyNowBtn, (isOutOfStock || addingToCart) && styles.btnDis]}
            onPress={handleBuyNow}
            disabled={isOutOfStock || addingToCart}
          >
            <Text style={styles.buyNowTxt}>
              {isOutOfStock ? t('outOfStock') : t('buyNow')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  loadingCon:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  notFoundTxt:   { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 12 },
  scrollContent: { paddingTop: 0 },

  // ── Header & action overlays — all fixed, never scroll ──
  // imageActionsOverlay: ALWAYS fixed at image bottom-right, never moved to top
  imageActionsOverlay: { position: 'absolute', top: GALLERY_HEIGHT - 52, right: 12, zIndex: 20, flexDirection: 'row', gap: 8 },
  floatingHeader:      { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  floatingHeaderSolid: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: 4, paddingBottom: 4 },
  headerRowSolid:      { paddingVertical: 6 },
  headerTitle:         { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginHorizontal: 8 },
  headerBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center', ...Shadow.sm },

  // ── Info card ──
  infoCard:    { backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  badgesRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  catBadge:    { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full },
  catBadgeTxt: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  urgBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  urgTxt:      { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  productName:    { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, lineHeight: 30, marginBottom: 2 },
  productNameSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },

  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: Spacing.sm },
  ratingVal:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  ratingCount: { fontSize: FontSize.sm, color: Colors.textSecondary },
  ratingDiv:   { fontSize: FontSize.sm, color: Colors.textLight },
  soldCnt:     { fontSize: FontSize.sm, color: Colors.textSecondary },

  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  priceLeft:   { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  mainPrice:   { fontSize: 28, fontWeight: FontWeight.extrabold, color: Colors.text },
  origPrice:   { fontSize: FontSize.base, color: Colors.textLight, textDecorationLine: 'line-through' },
  discBadge:   { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  discTxt:     { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.danger },

  delivRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  delivTxt:    { fontSize: FontSize.sm, color: Colors.textSecondary },
  delivNote:   { fontSize: FontSize.xs, color: Colors.textLight },

  // ── Section cards ──
  sectionCard:  { backgroundColor: Colors.surface, marginTop: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:      { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.background, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderLight },
  tagTxt:       { fontSize: FontSize.xs, color: Colors.textSecondary },

  // ── Quantity ──
  sectionTitle:  { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  qtyRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyControls:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  qtyBtn:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDis:     { borderColor: Colors.borderLight },
  qtyVal:        { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, minWidth: 32, textAlign: 'center' },
  qtyHints:      { flexDirection: 'row', gap: 16, marginTop: 6 },
  qtyHint:       { fontSize: FontSize.xs, color: Colors.textSecondary },

  // ── Info table ──
  infoTable:  { gap: 0 },
  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  infoLabel:  { fontSize: FontSize.sm, color: Colors.textSecondary },
  infoValue:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  // ── Description ──
  descTxt:    { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  // ── Seller ──
  sellerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerLogo:   { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.surface },
  sellerLogoFb: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  storeName:    { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  sellerRatTxt: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sellerSales:  { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },

  // ── Reviews ──
  showMoreBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  showMoreTxt:  { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  noReviews:    { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8 },
  noReviewsTxt: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  // ── Related ──
  relatedSection: { backgroundColor: Colors.surface, marginTop: 1, paddingBottom: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  relatedList:    { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs },

  // ── Bottom bar ──
  bottomBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, ...Shadow.md },
  totalCol:    { flex: 1 },
  totalLbl:    { fontSize: FontSize.xs, color: Colors.textSecondary },
  totalPrice:  { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text },
  actionBtns:  { flexDirection: 'row', gap: 10 },
  cartBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 12, borderRadius: BorderRadius['2xl'] },
  cartBtnTxt:  { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  buyNowBtn:   { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center' },
  buyNowTxt:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  btnDis:      { opacity: 0.5 },
});
