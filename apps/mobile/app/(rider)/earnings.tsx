import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { riderApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

export default function EarningsScreen() {
  const currency = useSelector((state: any) => state.appSettings?.currencySymbol ?? '₨');
  const { t } = useLanguage();
  const [earnings, setEarnings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    riderApi.getEarnings().then((res) => { setEarnings(res.data); }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.secondary} /></View>;

  const stats = [
    { icon: 'bicycle', label: t('riderTodayDeliveries'), value: earnings?.todayDeliveries || 0, color: Colors.secondary },
    { icon: 'wallet', label: t('riderTodayEarnings'), value: `${currency}${(earnings?.todayEarnings || 0).toLocaleString()}`, color: Colors.primary },
    { icon: 'trophy', label: t('riderTotalDeliveries'), value: earnings?.totalDeliveries || 0, color: Colors.info },
    { icon: 'cash', label: t('riderTotalEarnings'), value: `${currency}${(earnings?.totalEarnings || 0).toLocaleString()}`, color: Colors.success },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('riderEarningsTitle')}</Text>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={Colors.secondary} />
          <Text style={styles.ratingText}>{earnings?.rating?.toFixed(1) || '—'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { borderTopColor: stat.color }]}>
              <Ionicons name={stat.icon as any} size={28} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
          <Text style={styles.infoText}>{t('riderEarningsInfo')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#374151', borderRadius: BorderRadius.full },
  ratingText: { color: '#F9FAFB', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  content: { padding: Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#1F2937',
    borderRadius: BorderRadius.lg, padding: Spacing.base,
    alignItems: 'center', borderTopWidth: 3,
  },
  statValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: '#F9FAFB', marginTop: 8 },
  statLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  infoCard: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#1F2937', borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderLeftWidth: 3, borderLeftColor: Colors.info,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: '#9CA3AF', lineHeight: 20 },
});
