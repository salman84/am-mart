import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { topupApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import { useLanguage } from '../../../src/i18n';

export default function TopupHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    topupApi.getMyOrders()
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : res.data?.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => {
    if (s === 'COMPLETED') return Colors.primary;
    if (s === 'FAILED') return Colors.danger;
    return Colors.secondary;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('topupHistory')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.topup} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="flash-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>{t('noHistory')}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.flag}>{item.countryFlag || '🌐'}</Text>
                <View>
                  <Text style={styles.cardCountry}>{item.countryName}</Text>
                  <Text style={styles.cardPhone}>{item.recipientPhone || item.phoneNumber}</Text>
                  <Text style={styles.cardOperator}>{item.operator}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.amount}>{item.amount} {item.currency}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  list: { padding: Spacing.base, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, ...Shadow.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flag: { fontSize: 32 },
  cardCountry: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  cardPhone: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  cardOperator: { fontSize: FontSize.xs, color: Colors.textLight },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.topup },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary },
});
