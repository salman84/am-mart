import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { couponApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

type Tab = 'active' | 'used';

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  MANUAL:            { label: 'Promo Code',      color: Colors.textSecondary, bg: '#F3F4F6', icon: 'pricetag-outline' },
  WELCOME:           { label: 'Welcome Bonus',   color: '#7C3AED',            bg: '#EDE9FE', icon: 'gift-outline' },
  FIRST_PURCHASE:    { label: 'First Purchase',  color: '#2563EB',            bg: '#DBEAFE', icon: 'bag-handle-outline' },
  REFERRAL_SENDER:   { label: 'Referral Reward', color: '#059669',            bg: '#D1FAE5', icon: 'people-outline' },
  REFERRAL_RECEIVER: { label: 'Referral Signup', color: '#D97706',            bg: '#FEF3C7', icon: 'star-outline' },
};

function CouponCard({ item, currency }: { item: any; currency: string }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.MANUAL;
  const { t } = useLanguage();
  const expiresDate = item.expiresAt ? new Date(item.expiresAt) : null;
  const isExpiringSoon = expiresDate
    ? (expiresDate.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <View style={[styles.card, item.isUsed && styles.cardUsed]}>
      {/* Dashed divider dot decoration */}
      <View style={styles.notchLeft} />
      <View style={styles.notchRight} />
      <View style={styles.dashedLine} />

      <View style={styles.cardLeft}>
        <View style={[styles.categoryBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
          <Text style={[styles.categoryLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>

        <Text style={styles.discountText}>
          {item.type === 'PERCENTAGE'
            ? `${item.value}% OFF`
            : `${currency}${item.value?.toLocaleString()} OFF`}
        </Text>

        {item.title && <Text style={styles.couponTitle}>{item.title}</Text>}
        {item.description && <Text style={styles.couponDesc} numberOfLines={2}>{item.description}</Text>}

        <View style={styles.metaRow}>
          {item.minOrderAmount > 0 && (
            <Text style={styles.metaText}>
              {t('couponMinOrder')}: {currency}{item.minOrderAmount.toLocaleString()}
            </Text>
          )}
          {expiresDate && (
            <Text style={[styles.metaText, isExpiringSoon && !item.isUsed && styles.metaUrgent]}>
              {isExpiringSoon && !item.isUsed ? '⚠ ' : ''}{t('couponExpires')}: {expiresDate.toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.codeText}>{item.code}</Text>
        {item.isUsed ? (
          <View style={styles.usedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.textLight} />
            <Text style={styles.usedText}>{t('couponUsed')}</Text>
          </View>
        ) : item.isValid ? (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>{t('couponActive')}</Text>
          </View>
        ) : (
          <View style={styles.usedBadge}>
            <Text style={styles.usedText}>{t('couponInactive')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CouponsScreen() {
  const { t } = useLanguage();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₨');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('active');

  const load = async () => {
    try {
      const res = await couponApi.getMyCoupons();
      setCoupons(res.data?.coupons || []);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeCoupons = coupons.filter((c) => c.isValid && !c.isUsed);
  const usedCoupons = coupons.filter((c) => c.isUsed || !c.isValid);
  const displayed = tab === 'active' ? activeCoupons : usedCoupons;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('couponWallet')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            {t('activeCoupons')} ({activeCoupons.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'used' && styles.tabActive]}
          onPress={() => setTab('used')}
        >
          <Text style={[styles.tabText, tab === 'used' && styles.tabTextActive]}>
            {t('usedCoupons')} ({usedCoupons.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pricetag-outline" size={60} color={Colors.borderLight} />
          <Text style={styles.emptyTitle}>{t('noCouponsYet')}</Text>
          <Text style={styles.emptySub}>{t('noCouponsYetSub')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {displayed.map((item) => (
            <CouponCard key={item.userCouponId || item.couponId} item={item} currency={currency} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  tabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 12 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  list: { padding: Spacing.base, gap: 14 },
  // Coupon card — ticket style
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    flexDirection: 'row', overflow: 'hidden',
    ...Shadow.sm, position: 'relative',
    minHeight: 120,
  },
  cardUsed: { opacity: 0.55 },
  notchLeft: {
    position: 'absolute', left: '55%', top: -10, width: 20, height: 20,
    borderRadius: 10, backgroundColor: Colors.background, zIndex: 2,
    transform: [{ translateX: -10 }],
  },
  notchRight: {
    position: 'absolute', left: '55%', bottom: -10, width: 20, height: 20,
    borderRadius: 10, backgroundColor: Colors.background, zIndex: 2,
    transform: [{ translateX: -10 }],
  },
  dashedLine: {
    position: 'absolute', left: '55%', top: 10, bottom: 10, width: 1,
    borderStyle: 'dashed', borderLeftWidth: 1, borderColor: Colors.borderLight, zIndex: 1,
  },
  cardLeft: { flex: 1, padding: Spacing.base, gap: 6, paddingRight: Spacing.sm },
  cardRight: {
    width: '45%', alignItems: 'center', justifyContent: 'center',
    padding: Spacing.sm, gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  categoryLabel: { fontSize: 10, fontWeight: FontWeight.bold },
  discountText: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.primary },
  couponTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  couponDesc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  metaRow: { gap: 2 },
  metaText: { fontSize: 10, color: Colors.textSecondary },
  metaUrgent: { color: '#D97706', fontWeight: FontWeight.semibold },
  codeText: {
    fontFamily: 'monospace', fontSize: FontSize.base, fontWeight: FontWeight.extrabold,
    color: Colors.primary, letterSpacing: 1, textAlign: 'center',
  },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  activeText: { fontSize: FontSize.xs, color: '#22C55E', fontWeight: FontWeight.semibold },
  usedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  usedText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
});
