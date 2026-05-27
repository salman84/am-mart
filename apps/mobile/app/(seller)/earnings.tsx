import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sellerApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  PAID: Colors.primary,
  FAILED: Colors.danger,
};

export default function SellerEarningsScreen() {
  const [data, setData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [earningsRes, payoutsRes] = await Promise.allSettled([
        sellerApi.getEarnings(),
        sellerApi.getPayouts({ limit: 20 }),
      ]);
      if (earningsRes.status === 'fulfilled') setData(earningsRes.value.data);
      if (payoutsRes.status === 'fulfilled') setPayouts(payoutsRes.value.data.payouts || []);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (isLoading) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const stats = [
    { label: 'Today', value: `₩${(data?.todayEarnings || 0).toLocaleString()}`, icon: 'today-outline', color: Colors.primary },
    { label: 'This Week', value: `₩${(data?.weekEarnings || 0).toLocaleString()}`, icon: 'calendar-outline', color: Colors.info },
    { label: 'This Month', value: `₩${(data?.monthEarnings || 0).toLocaleString()}`, icon: 'bar-chart-outline', color: Colors.secondary },
    { label: 'Pending Payout', value: `₩${(data?.pendingPayout || 0).toLocaleString()}`, icon: 'time-outline', color: Colors.warning },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {/* Total Earnings Banner */}
        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Earnings</Text>
          <Text style={styles.totalValue}>₩{(data?.totalEarnings || 0).toLocaleString()}</Text>
          <Text style={styles.totalSub}>Lifetime revenue after {data?.commissionRate || 0}% commission</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <View style={[styles.statIcon, { backgroundColor: `${s.color}20` }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Pending Payout Card */}
        {data?.pendingPayout > 0 && (
          <View style={styles.payoutCard}>
            <View>
              <Text style={styles.payoutLabel}>Pending Payout</Text>
              <Text style={styles.payoutValue}>₩{(data?.pendingPayout || 0).toLocaleString()}</Text>
              <Text style={styles.payoutSub}>Will be processed within 3-5 business days</Text>
            </View>
            <Ionicons name="cash-outline" size={32} color={Colors.warning} />
          </View>
        )}

        {/* Recent Transactions */}
        {data?.recentTransactions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {data.recentTransactions.map((tx: any) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txIcon}>
                  <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>Order #{tx.order?.orderNumber}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString('ko-KR')}</Text>
                </View>
                <Text style={[styles.txAmount, { color: Colors.primary }]}>+₩{tx.sellerAmount?.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Payout History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout History</Text>
          {payouts.length === 0 ? (
            <View style={styles.emptyPayouts}>
              <Ionicons name="cash-outline" size={36} color={Colors.textLight} />
              <Text style={styles.emptyPayoutsText}>No payouts yet</Text>
            </View>
          ) : (
            payouts.map((payout: any) => {
              const color = PAYOUT_STATUS_COLORS[payout.status] || Colors.textSecondary;
              return (
                <View key={payout.id} style={styles.payoutRow}>
                  <View style={[styles.payoutIconWrap, { backgroundColor: `${color}20` }]}>
                    <Ionicons name="wallet-outline" size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc}>
                      {new Date(payout.createdAt).toLocaleDateString('ko-KR')}
                    </Text>
                    <View style={[styles.payoutBadge, { backgroundColor: `${color}20` }]}>
                      <Text style={[styles.payoutBadgeText, { color }]}>{payout.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, { color }]}>
                    ₩{(payout.amount || 0).toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  totalBanner: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', ...Shadow.md },
  totalLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  totalValue: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold, color: '#fff', marginVertical: 4 },
  totalSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, borderTopWidth: 3, ...Shadow.sm, gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  payoutCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.warningLight || '#FFF7ED', borderRadius: BorderRadius.xl, padding: Spacing.base, borderWidth: 1, borderColor: `${Colors.warning}40` },
  payoutLabel: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: FontWeight.semibold },
  payoutValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginVertical: 2 },
  payoutSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  txIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  txDesc: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  txDate: { fontSize: FontSize.xs, color: Colors.textSecondary },
  txAmount: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  emptyPayouts: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  emptyPayoutsText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  payoutIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  payoutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: 2 },
  payoutBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
