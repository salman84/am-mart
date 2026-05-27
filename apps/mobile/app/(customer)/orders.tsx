import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { orderApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const STATUS_META: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING: { color: '#D97706', bg: '#FEF3C7', icon: 'time-outline', label: 'Pending' },
  CONFIRMED: { color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline', label: 'Confirmed' },
  PREPARING: { color: '#7C3AED', bg: '#EDE9FE', icon: 'restaurant-outline', label: 'Preparing' },
  PICKED_UP: { color: '#059669', bg: '#D1FAE5', icon: 'bicycle-outline', label: 'Picked Up' },
  OUT_FOR_DELIVERY: { color: '#0891B2', bg: '#CFFAFE', icon: 'navigate-outline', label: 'On the way' },
  DELIVERED: { color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-done-circle', label: 'Delivered' },
  CANCELLED: { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline', label: 'Cancelled' },
};

function formatDate(dateStr: string, locale = 'en-US') {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getExpectedArrival(createdAt: string, status: string) {
  const d = new Date(createdAt);
  if (status === 'DELIVERED') return `Delivered ${formatDate(createdAt)}`;
  d.setDate(d.getDate() + 2);
  return `Expected by ${d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
}

export default function OrdersScreen() {
  const { t } = useLanguage();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');

  const STATUS_TABS = [
    { key: 'All', label: t('statusAll') },
    { key: 'PENDING', label: t('statusPending') },
    { key: 'CONFIRMED', label: t('statusConfirmed') },
    { key: 'OUT_FOR_DELIVERY', label: t('statusDelivery') },
    { key: 'DELIVERED', label: t('statusDelivered') },
    { key: 'CANCELLED', label: t('statusCancelled') },
  ];

  const [selectedStatus, setSelectedStatus] = useState('All');
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadOrders = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    try {
      const status = selectedStatus !== 'All' ? selectedStatus : undefined;
      const res = await orderApi.getMyOrders({ page: currentPage, limit: 10, status });
      const newOrders = res.data.orders || [];
      if (reset) {
        setOrders(newOrders);
        setPage(2);
      } else {
        setOrders((prev) => [...prev, ...newOrders]);
        setPage((p) => p + 1);
      }
      setHasMore(currentPage * 10 < (res.data.total || 0));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus, page]);

  useEffect(() => {
    setIsLoading(true);
    setOrders([]);
    setPage(1);
    loadOrders(true);
  }, [selectedStatus]);

  const onRefresh = () => { setRefreshing(true); loadOrders(true); };

  const renderOrder = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] || { color: Colors.textSecondary, bg: '#F5F5F5', icon: 'ellipse-outline', label: item.status };
    const firstImg = item.items?.[0]?.product?.images?.[0]?.url;
    const isDelivered = item.status === 'DELIVERED';
    const isActive = ['PENDING', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(item.status);
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.95}
        onPress={() => router.push({ pathname: '/(customer)/order/[id]', params: { id: item.id } })}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Product Thumbnails */}
        <View style={styles.productRow}>
          {(item.items || []).slice(0, 4).map((oi: any, idx: number) => {
            const img = oi.product?.images?.[0]?.url;
            return (
              <View key={idx} style={styles.thumbBox}>
                {img ? (
                  <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name="cube-outline" size={18} color={Colors.textLight} />
                  </View>
                )}
              </View>
            );
          })}
          {itemCount > 4 && (
            <View style={[styles.thumbBox, styles.thumbMore]}>
              <Text style={styles.thumbMoreText}>+{itemCount - 4}</Text>
            </View>
          )}
        </View>

        {/* Item names summary */}
        <Text style={styles.orderItemsText} numberOfLines={1}>
          {item.items?.map((i: any) => i.productName || i.product?.name).filter(Boolean).join(', ')}
        </Text>

        {/* Arrival info */}
        <View style={styles.arrivalRow}>
          <Ionicons name={isDelivered ? 'checkmark-circle' : 'time-outline'} size={14}
            color={isDelivered ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.arrivalText, isDelivered && { color: Colors.primary }]}>
            {getExpectedArrival(item.createdAt, item.status)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>{t('orderTotal')}</Text>
            <Text style={styles.orderTotal}>{currency}{item.total?.toLocaleString()}</Text>
          </View>
          <View style={styles.actionBtns}>
            {isDelivered && (
              <TouchableOpacity style={styles.buyAgainBtn}
                onPress={() => router.push('/(customer)/products')}>
                <Text style={styles.buyAgainText}>{t('buyAgain')}</Text>
              </TouchableOpacity>
            )}
            {isActive && (
              <TouchableOpacity style={styles.trackBtn}
                onPress={(e) => { e.stopPropagation(); }}>
                <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                <Text style={styles.trackText}>{t('trackOrder')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.detailBtn}
              onPress={() => router.push({ pathname: '/(customer)/order/[id]', params: { id: item.id } })}>
              <Text style={styles.detailText}>{t('orderDetails')}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('myOrdersTitle')}</Text>
      </View>

      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          data={STATUS_TABS}
          keyExtractor={(s) => s.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, selectedStatus === item.key && styles.tabActive]}
              onPress={() => setSelectedStatus(item.key)}
            >
              <Text style={[styles.tabText, selectedStatus === item.key && styles.tabTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>{t('noOrdersYet')}</Text>
          <Text style={styles.emptySubtitle}>{t('orderHistoryEmpty')}</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/(customer)')}>
            <Text style={styles.shopButtonText}>{t('startShopping')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          onEndReached={() => hasMore && loadOrders()}
          onEndReachedThreshold={0.3}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  tabsWrapper: { height: 52, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, justifyContent: 'center' },
  tabsContainer: { paddingHorizontal: Spacing.base, paddingVertical: 10, gap: 8, alignItems: 'center' },
  tab: {
    height: 32, paddingHorizontal: 14,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    borderColor: Colors.borderLight, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: FontWeight.bold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, gap: 10 },
  emptyIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
  shopButton: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base, borderRadius: BorderRadius['2xl'] },
  shopButtonText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  listContent: { padding: Spacing.sm },
  orderCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.base, gap: 10, ...Shadow.sm,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  orderDate: { fontSize: FontSize.xs, color: Colors.textSecondary },
  productRow: { flexDirection: 'row', gap: 8 },
  thumbBox: {
    width: 56, height: 56, borderRadius: BorderRadius.md,
    overflow: 'hidden', backgroundColor: Colors.surfaceVariant,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  thumbMore: { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.borderLight },
  thumbMoreText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  orderItemsText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  arrivalText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  totalLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  orderTotal: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.primary },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buyAgainBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.full,
  },
  buyAgainText: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  trackText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailText: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
