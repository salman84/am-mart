import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { productApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - 10) / 2;

export default function ProductsScreen() {
  const { search, categoryId, categoryName, featured } = useLocalSearchParams<{
    search?: string; categoryId?: string; categoryName?: string; featured?: string;
  }>();
  const { t } = useLanguage();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(search || '');
  // Stable ref so load doesn't trigger re-renders on text change
  const searchRef = useRef(search || '');

  const title = categoryName || (featured === 'true' ? t('featuredProducts') : t('allProducts'));

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (categoryId) params.categoryId = categoryId;
      const q = query !== undefined ? query : searchRef.current;
      if (q.trim()) params.search = q.trim();
      if (featured === 'true') params.featured = true;
      const res = await productApi.getAll(params);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.products || []);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, featured]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = () => {
    searchRef.current = searchText;
    load(searchText);
  };

  const handleClearSearch = () => {
    setSearchText('');
    searchRef.current = '';
    load('');
  };

  const renderItem = ({ item }: { item: any }) => {
    const price = item.discountPrice || item.price;
    const image = item.images?.[0]?.url;
    const discountPct = item.discountPrice ? Math.round((1 - item.discountPrice / item.price) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(customer)/product/[id]', params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={styles.cardImg}>
          {image ? (
            <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Ionicons name="image-outline" size={32} color={Colors.textLight} />
            </View>
          )}
          {discountPct > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPct}%</Text>
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.store} numberOfLines={1}>{item.seller?.storeName || ''}</Text>
          <View style={styles.priceRow}>
            {item.discountPrice && <Text style={styles.originalPrice}>{currency}{item.price?.toLocaleString()}</Text>}
            <Text style={styles.price}>{currency}{(price || 0).toLocaleString()}</Text>
          </View>
          {item.rating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#FBBF24" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          placeholder={t('searchProducts')}
          placeholderTextColor={Colors.textLight}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons name="close-circle" size={17} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={52} color={Colors.textLight} />
          <Text style={styles.emptyText}>{t('noProducts')}</Text>
          <Text style={styles.emptySubText}>{t('tryDifferent')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          // Fix scroll jumping
          removeClippedSubviews={false}
          windowSize={7}
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
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
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.base, paddingHorizontal: Spacing.base, height: 44,
    backgroundColor: '#fff', borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: '#E5E7EB', ...Shadow.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  list: { paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: 24 },
  row: { justifyContent: 'space-between', marginBottom: 10 },
  card: {
    width: CARD_WIDTH, backgroundColor: '#fff',
    borderRadius: BorderRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  cardImg: { height: 140, backgroundColor: '#F5F5F5' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { padding: Spacing.sm },
  name: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 16 },
  store: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.primary },
  originalPrice: { fontSize: 10, color: Colors.textLight, textDecorationLine: 'line-through' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  ratingText: { fontSize: 10, color: Colors.textSecondary },
  discountBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: Colors.danger, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
  },
  discountText: { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
