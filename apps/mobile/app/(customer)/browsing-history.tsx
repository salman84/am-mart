import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { getBrowsingHistory, clearBrowsingHistory, HistoryProduct } from '../../src/utils/browsingHistory';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function BrowsingHistoryScreen() {
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
  const [history, setHistory] = useState<HistoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const h = await getBrowsingHistory();
    setHistory(h);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClear = () => {
    Alert.alert(
      'Clear History',
      'Remove all browsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive',
          onPress: async () => {
            await clearBrowsingHistory();
            setHistory([]);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browsing History</Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtn}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySub}>Products you view will appear here</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(customer)/products' as any)}>
            <Text style={styles.shopBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const displayPrice = item.discountPrice ?? item.price;
            const hasDiscount = !!(item.discountPrice && item.discountPrice < item.price);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/(customer)/product/[id]', params: { id: item.id } } as any)}
                activeOpacity={0.85}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.img} resizeMode="cover" />
                ) : (
                  <View style={[styles.img, styles.imgPlaceholder]}>
                    <Ionicons name="image-outline" size={32} color={Colors.borderLight} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{currency}{displayPrice.toLocaleString()}</Text>
                    {hasDiscount && (
                      <Text style={styles.originalPrice}>{currency}{item.price.toLocaleString()}</Text>
                    )}
                  </View>
                  <Text style={styles.time}>{timeAgo(item.viewedAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.borderLight} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12 },
  headerTitle:    { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  clearBtn:       { fontSize: FontSize.sm, color: Colors.danger, fontWeight: FontWeight.semibold },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.xl },
  emptyTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  emptySub:       { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  shopBtn:        { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: BorderRadius['2xl'] },
  shopBtnText:    { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.base },
  list:           { padding: Spacing.base },
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.sm, ...Shadow.sm, gap: 12 },
  img:            { width: 72, height: 72, borderRadius: BorderRadius.lg, backgroundColor: Colors.background },
  imgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  info:           { flex: 1, gap: 4 },
  name:           { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 18 },
  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price:          { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: Colors.primary },
  originalPrice:  { fontSize: FontSize.xs, color: Colors.textLight, textDecorationLine: 'line-through' },
  time:           { fontSize: FontSize.xs, color: Colors.textLight },
});
