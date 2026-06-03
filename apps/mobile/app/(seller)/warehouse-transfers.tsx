import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { sellerWarehouseApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  REQUESTED: { bg: '#FEF3C7', text: '#92400E' },
  APPROVED: { bg: '#DBEAFE', text: '#1E40AF' },
  SHIPPED: { bg: '#E0E7FF', text: '#3730A3' },
  IN_TRANSIT: { bg: '#F3E8FF', text: '#6B21A8' },
  RECEIVED: { bg: '#D1FAE5', text: '#065F46' },
  PARTIALLY_RECEIVED: { bg: '#FFEDD5', text: '#C2410C' },
  REJECTED: { bg: '#FEE2E2', text: '#991B1B' },
  CANCELLED: { bg: '#F3F4F6', text: '#6B7280' },
};

export default function SellerWarehouseTransfersScreen() {
  const { t } = useLanguage();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransfers = useCallback(async () => {
    try {
      const res = await sellerWarehouseApi.getTransfers({ limit: 50 });
      setTransfers(res.data.transfers || []);
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadTransfers(); }, [loadTransfers]));

  const renderTransfer = ({ item }: { item: any }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.REQUESTED;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.transferNumber}>{item.transferNumber}</Text>
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status?.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.destinationFulfillment?.name || t('somethingWrong')}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.totalItems}</Text>
            <Text style={styles.statLabel}>{t('total')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{item.totalReceived}</Text>
            <Text style={styles.statLabel}>{t('received') || 'Received'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{item.items?.length || 0}</Text>
            <Text style={styles.statLabel}>{t('products') || 'Products'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('warehouseTransfers') || 'Warehouse Transfers'}</Text>
        <TouchableOpacity onPress={() => router.push('/(seller)/create-transfer')}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : transfers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="swap-horizontal-outline" size={56} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>{t('noTransfers') || 'No transfers yet'}</Text>
          <Text style={styles.emptySubtitle}>{t('createTransferDesc') || 'Send products to the warehouse for fulfillment'}</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(seller)/create-transfer')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>{t('createTransfer') || 'Create Transfer'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={transfers}
          keyExtractor={(item) => item.id}
          renderItem={renderTransfer}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadTransfers(); }}
              tintColor={Colors.primary} />
          }
        />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius['2xl'] },
  createBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  list: { padding: Spacing.base },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base,
    ...Shadow.sm, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  transferNumber: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, fontFamily: 'monospace' },
  dateText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
