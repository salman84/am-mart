import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { sellerApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';

export default function SellerDashboard() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const res = await sellerApi.getDashboard();
      setDashboard(res.data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  const stats = [
    { icon: 'cube-outline', label: 'Products', value: dashboard?.totalProducts || 0, color: Colors.info },
    { icon: 'receipt-outline', label: 'Total Orders', value: dashboard?.totalOrders || 0, color: Colors.secondary },
    { icon: 'cash-outline', label: "Today's Revenue", value: `₩${(dashboard?.todayRevenue || 0).toLocaleString()}`, color: Colors.primary },
    { icon: 'wallet-outline', label: 'Pending Payout', value: `₩${(dashboard?.pendingPayout || 0).toLocaleString()}`, color: Colors.warning },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Welcome back,</Text>
          <Text style={styles.headerName}>{user?.fullName}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={Colors.secondary} />
          <Text style={styles.ratingText}>{dashboard?.rating?.toFixed(1) || '—'}</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={Colors.primary} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.earningCard}>
          <Text style={styles.earningLabel}>Total Earnings</Text>
          <Text style={styles.earningValue}>₩{(dashboard?.totalEarnings || 0).toLocaleString()}</Text>
          <Text style={styles.earningSubtitle}>Lifetime revenue (after commission)</Text>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.quickTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'add-circle', label: 'Add Product', color: Colors.primary, action: () => router.push('/(seller)/add-product') },
              { icon: 'receipt', label: 'View Orders', color: Colors.secondary, action: () => router.push('/(seller)/orders') },
              { icon: 'analytics', label: 'Analytics', color: Colors.info, action: () => {} },
              { icon: 'settings', label: 'Store Settings', color: Colors.textSecondary, action: () => {} },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.actionBtn} onPress={item.action}>
                <View style={[styles.actionIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerGreeting: { fontSize: FontSize.sm, color: Colors.textSecondary },
  headerName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.secondaryLight, borderRadius: BorderRadius.full,
  },
  ratingText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  content: { padding: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderLeftWidth: 4, ...Shadow.sm,
  },
  statValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginTop: 8 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  earningCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg, alignItems: 'center',
  },
  earningLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  earningValue: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold, color: '#fff', marginVertical: 4 },
  earningSubtitle: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  quickActions: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.sm },
  quickTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.base },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: { width: '45%', alignItems: 'center', padding: Spacing.base },
  actionIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xs },
  actionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text, textAlign: 'center' },
});
