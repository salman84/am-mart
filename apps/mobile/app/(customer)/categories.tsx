import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { categoryApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - Spacing.lg * 2 - 16) / 3;

const FALLBACK = [
  { id: '1', name: 'Meat & Fish' },
  { id: '2', name: 'Dairy & Milk' },
  { id: '3', name: 'Bakery' },
  { id: '4', name: 'Rice & Grains' },
  { id: '5', name: 'Beverages' },
  { id: '6', name: 'Personal Care' },
  { id: '7', name: 'Cleaning' },
  { id: '8', name: 'Snacks' },
  { id: '9', name: 'Frozen Food' },
  { id: '10', name: 'Condiments' },
  { id: '11', name: 'Eggs' },
  { id: '12', name: 'Canned Goods' },
];

const CAT_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  'Meat & Fish':    { icon: 'nutrition-outline',   color: '#EF4444', bg: '#FEF2F2' },
  'Dairy & Milk':   { icon: 'water-outline',        color: '#3B82F6', bg: '#EFF6FF' },
  'Bakery':         { icon: 'cafe-outline',          color: '#F97316', bg: '#FFF7ED' },
  'Rice & Grains':  { icon: 'layers-outline',        color: '#A16207', bg: '#FEFCE8' },
  'Beverages':      { icon: 'wine-outline',          color: '#8B5CF6', bg: '#F5F3FF' },
  'Personal Care':  { icon: 'body-outline',          color: '#EC4899', bg: '#FDF2F8' },
  'Cleaning':       { icon: 'sparkles-outline',      color: '#06B6D4', bg: '#ECFEFF' },
  'Snacks':         { icon: 'fast-food-outline',     color: '#F59E0B', bg: '#FFFBEB' },
  'Frozen Food':    { icon: 'snow-outline',          color: '#60A5FA', bg: '#EFF6FF' },
  'Condiments':     { icon: 'flask-outline',         color: '#10B981', bg: '#ECFDF5' },
  'Eggs':           { icon: 'ellipse-outline',       color: '#F97316', bg: '#FFF7ED' },
  'Canned Goods':   { icon: 'archive-outline',       color: '#6B7280', bg: '#F9FAFB' },
  'Fruits & Vegetables': { icon: 'leaf-outline',    color: '#22C55E', bg: '#F0FDF4' },
  'Household':      { icon: 'home-outline',          color: '#6366F1', bg: '#EEF2FF' },
};

const FALLBACK_STYLES = Object.values(CAT_STYLES);

function getCatStyle(name: string, index: number) {
  return CAT_STYLES[name] || FALLBACK_STYLES[index % FALLBACK_STYLES.length];
}

export default function CategoriesScreen() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryApi.getAll()
      .then((res) => setCategories(Array.isArray(res.data) && res.data.length > 0 ? res.data : FALLBACK))
      .catch(() => setCategories(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  // Build rows of 3 for ScrollView
  const rows: any[][] = [];
  for (let i = 0; i < categories.length; i += 3) {
    rows.push(categories.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('shopCategories' as any) || t('categories')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        >
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((item: any, colIdx: number) => {
                const s = getCatStyle(item.name, rowIdx * 3 + colIdx);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => router.push({ pathname: '/(customer)/products', params: { categoryId: item.id, categoryName: item.name } })}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.iconBox, { backgroundColor: s.bg }]}>
                      <Ionicons name={s.icon} size={28} color={s.color} />
                    </View>
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Fill empty slots if not a full row */}
              {row.length === 1 && <><View style={styles.cardEmpty} /><View style={styles.cardEmpty} /></>}
              {row.length === 2 && <View style={styles.cardEmpty} />}
            </View>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  list: { padding: Spacing.lg, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  card: {
    width: CARD_SIZE,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.base,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0',
    ...Shadow.sm,
  },
  cardEmpty: { width: CARD_SIZE },
  iconBox: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
  },
  cardName: {
    fontSize: 11, fontWeight: FontWeight.semibold,
    color: Colors.text, textAlign: 'center', lineHeight: 15,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
