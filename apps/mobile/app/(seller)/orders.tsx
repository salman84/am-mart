import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sellerApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.info,
  PREPARING: Colors.secondary,
  PICKED_UP: Colors.secondary,
  OUT_FOR_DELIVERY: Colors.topup,
  DELIVERED: Colors.primary,
  CANCELLED: Colors.danger,
};

const STATUS_TABS = ['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERED'];

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const status = selectedTab !== 'ALL' ? selectedTab : undefined;
      const res = await sellerApi.getOrders({ status, page: 1, limit: 50 });
      setOrders(res.data.orders || []);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedTab]);

  useEffect(() => { setIsLoading(true); loadOrders(); }, [selectedTab]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await sellerApi.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      Toast.show({ type: 'success', text1: `Order marked as ${status}` });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update order' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(s) => s}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, selectedTab === item && styles.tabActive]}
            onPress={() => setSelectedTab(item)}
          >
            <Text style={[styles.tabText, selectedTab === item && styles.tabTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={56} color={Colors.textLight} />
          <Text style={styles.emptyText}>No orders</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} tintColor={Colors.primary} />}
          renderItem={({ item }) => {
            const color = STATUS_COLORS[item.status] || Colors.textSecondary;
            return (
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                    <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                    <Text style={[styles.statusText, { color }]}>{item.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  {item.items?.slice(0, 2).map((i: any) => (
                    <Text key={i.id} style={styles.itemText} numberOfLines={1}>
                      • {i.productName} × {i.quantity}
                    </Text>
                  ))}
                  {item.items?.length > 2 && <Text style={styles.moreText}>+{item.items.length - 2} more items</Text>}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.total}>₩{item.total?.toLocaleString()}</Text>
                  {item.status === 'PENDING' && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={() => updateStatus(item.id, 'CONFIRMED')}>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'CONFIRMED' && (
                    <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.secondary }]} onPress={() => updateStatus(item.id, 'PREPARING')}>
                      <Text style={styles.confirmBtnText}>Start Preparing</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'PREPARING' && (
                    <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.info }]} onPress={() => updateStatus(item.id, 'PICKED_UP')}>
                      <Text style={styles.confirmBtnText}>Ready for Pickup</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  tabs: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  list: { padding: Spacing.base },
  orderCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderNum: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  orderDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  orderItems: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.xs, marginBottom: Spacing.xs },
  itemText: { fontSize: FontSize.sm, color: Colors.textSecondary, paddingVertical: 1 },
  moreText: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.primary },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full },
  confirmBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
