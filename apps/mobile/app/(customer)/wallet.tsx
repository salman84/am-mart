import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { walletApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';

const TX_ICON: Record<string, { name: string; color: string; bg: string }> = {
  CREDIT:   { name: 'arrow-down-circle-outline', color: '#10B981', bg: '#D1FAE5' },
  DEBIT:    { name: 'arrow-up-circle-outline',   color: '#EF4444', bg: '#FEE2E2' },
  REFUND:   { name: 'refresh-circle-outline',    color: '#3B82F6', bg: '#DBEAFE' },
  CASHBACK: { name: 'gift-outline',              color: '#F59E0B', bg: '#FEF3C7' },
  DEFAULT:  { name: 'swap-horizontal-outline',   color: Colors.primary, bg: Colors.primaryLight },
};

function fmt(n: number, sym: string) {
  return `${sym}${n.toLocaleString()}`;
}

export default function WalletScreen() {
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
  const [balance, setBalance]           = useState<number | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);

  const loadData = useCallback(async (p = 1, append = false) => {
    try {
      const [balRes, txRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions({ page: p, limit: 20 }),
      ]);
      setBalance(balRes.data?.balance ?? 0);
      const txs = txRes.data?.transactions || txRes.data || [];
      const total = txRes.data?.total || txs.length;
      setTransactions((prev) => append ? [...prev, ...txs] : txs);
      setHasMore(p * 20 < total);
      setPage(p);
    } catch {
      if (!append) { setBalance(0); setTransactions([]); }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData(1);
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(1);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    loadData(page + 1, true);
  };

  const txIcon = (type: string) => TX_ICON[type] || TX_ICON.DEFAULT;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceIconWrap}>
              <Ionicons name="wallet-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{fmt(balance ?? 0, currency)}</Text>
            <View style={styles.balanceBadge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#fff" />
              <Text style={styles.balanceBadgeTxt}>Secured Wallet</Text>
            </View>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoTxt}>Wallet credits are applied automatically at checkout</Text>
            </View>
          </View>

          {/* Transactions */}
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={56} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySub}>Your wallet activity will appear here</Text>
            </View>
          ) : (
            <>
              {transactions.map((tx: any, i: number) => {
                const icon = txIcon(tx.type);
                const isCredit = tx.type === 'CREDIT' || tx.type === 'REFUND' || tx.type === 'CASHBACK';
                return (
                  <View key={tx.id || i} style={styles.txCard}>
                    <View style={[styles.txIcon, { backgroundColor: icon.bg }]}>
                      <Ionicons name={icon.name as any} size={22} color={icon.color} />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description || tx.type || 'Transaction'}
                      </Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.createdAt).toLocaleDateString('en-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
                      {isCredit ? '+' : '-'}{fmt(Math.abs(tx.amount), currency)}
                    </Text>
                  </View>
                );
              })}
              {loadingMore && (
                <View style={styles.loadMore}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}
              {!hasMore && transactions.length > 0 && (
                <Text style={styles.noMore}>No more transactions</Text>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn:         { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:     { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:         { padding: Spacing.base, gap: 12, paddingBottom: 40 },

  balanceCard: {
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
    ...Shadow.md,
  },
  balanceIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  balanceLabel:    { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: FontWeight.medium },
  balanceAmount:   { fontSize: 36, fontWeight: FontWeight.extrabold, color: '#fff', letterSpacing: -0.5 },
  balanceBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  balanceBadgeTxt: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.medium },

  infoRow:   { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg, padding: Spacing.sm },
  infoItem:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoTxt:   { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },

  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },

  empty:      { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  emptySub:   { fontSize: FontSize.sm, color: Colors.textLight, textAlign: 'center' },

  txCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.base, paddingVertical: 14, ...Shadow.sm },
  txIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  txInfo:    { flex: 1, gap: 3 },
  txDesc:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  txDate:    { fontSize: FontSize.xs, color: Colors.textSecondary },
  txAmount:  { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },

  loadMore:  { paddingVertical: 16, alignItems: 'center' },
  noMore:    { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textLight, paddingVertical: 16 },
});
