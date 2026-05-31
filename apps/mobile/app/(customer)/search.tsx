import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../src/store';
import { addSearch, removeSearch, clearHistory } from '../../src/store/slices/searchHistorySlice';
import { productApi, categoryApi, appSettingsApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const DEFAULT_POPULAR = ['Milk', 'Rice', 'Chicken', 'Bread', 'Snacks', 'Drinks'];

export default function SearchScreen() {
  const dispatch = useDispatch();
  const history = useSelector((state: RootState) => state.searchHistory.items);
  const { t } = useLanguage();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched]   = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [currency, setCurrency]   = useState('₩');
  const [popular, setPopular]     = useState<string[]>(DEFAULT_POPULAR);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Load categories + settings on mount
  useEffect(() => {
    Promise.allSettled([
      categoryApi.getAll(),
      appSettingsApi.getPublic(),
    ]).then(([catsRes, settingsRes]) => {
      if (catsRes.status === 'fulfilled') {
        const cats = catsRes.value.data?.categories ?? catsRes.value.data ?? [];
        setCategories(cats.slice(0, 8));
      }
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data;
        if (s?.CURRENCY_SYMBOL) setCurrency(s.CURRENCY_SYMBOL);
        else if (s?.CURRENCY) setCurrency(s.CURRENCY);
        if (s?.APP_POPULAR_SEARCHES) {
          const terms = s.APP_POPULAR_SEARCHES.split(',').map((x: string) => x.trim()).filter(Boolean);
          if (terms.length > 0) setPopular(terms);
        }
      }
    });
  }, []);

  // Live suggestions debounce
  useEffect(() => {
    if (query.trim().length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await productApi.getAll({ search: query.trim(), page: 1, limit: 6 });
        setSuggestions(res.data?.products ?? res.data?.data ?? []);
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setSearched(false); return; }
    setSuggestions([]);
    setIsLoading(true);
    setSearched(true);
    dispatch(addSearch(trimmed));
    try {
      const res = await productApi.getAll({ search: trimmed, page: 1, limit: 20 });
      setResults(res.data.products || res.data?.data || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const handleHistoryTap = (q: string) => {
    setQuery(q);
    doSearch(q);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSuggestionTap = (item: any) => {
    setQuery(item.name);
    doSearch(item.name);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Search Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={19} color={Colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={t('searchProductsBrands')}
            placeholderTextColor={Colors.textLight}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query)}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => doSearch(query)} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>{t('search')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Live Suggestions Dropdown ── */}
      {suggestions.length > 0 && !searched && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <React.Fragment key={item.id}>
              <TouchableOpacity
                style={styles.suggestionRow}
                onPress={() => handleSuggestionTap(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={16} color={Colors.textSecondary} style={styles.suggestionIcon} />
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                  {(item.category?.name || item.seller?.storeName) && (
                    <Text style={styles.suggestionSub} numberOfLines={1}>
                      {item.category?.name || item.seller?.storeName}
                    </Text>
                  )}
                </View>
                <Ionicons name="arrow-forward-outline" size={14} color={Colors.textLight} />
              </TouchableOpacity>
              {index < suggestions.length - 1 && <View style={styles.suggestionDivider} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>

      ) : searched && results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={52} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>{t('noResultsFor')} "{query}"</Text>
          <Text style={styles.emptySubtitle}>{t('tryDifferentKeyword')}</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(customer)/categories' as any)}
          >
            <Text style={styles.browseBtnText}>{t('browseCategories')}</Text>
          </TouchableOpacity>
        </View>

      ) : searched && results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultList}
          renderItem={({ item }) => <SearchResultCard item={item} currency={currency} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

      ) : (
        /* ── Landing (no search yet) ── */
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Recent Searches — from Redux */}
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('recentSearches')}</Text>
                <TouchableOpacity onPress={() => dispatch(clearHistory())}>
                  <Text style={styles.clearAll}>{t('clearAll')}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsRow}>
                {history.map((item) => (
                  <View key={`${item.query}-${item.timestamp}`} style={styles.historyChip}>
                    <TouchableOpacity
                      onPress={() => handleHistoryTap(item.query)}
                      style={styles.chipInner}
                    >
                      <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.chipText} numberOfLines={1}>{item.query}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => dispatch(removeSearch(item.query))}
                      style={styles.chipClose}
                    >
                      <Ionicons name="close" size={13} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Browse Categories — from API */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('browseCategories')}</Text>
              <View style={styles.quickCats}>
                {categories.map((cat: any, i: number) => (
                  <TouchableOpacity
                    key={cat.id || i}
                    style={styles.quickCatItem}
                    onPress={() => router.push({
                      pathname: '/(customer)/products' as any,
                      params: { categoryId: cat.id, categoryName: cat.name },
                    })}
                  >
                    {cat.image ? (
                      <Image source={{ uri: cat.image }} style={styles.quickCatImg} resizeMode="cover" />
                    ) : (
                      <Text style={styles.quickCatEmoji}>{getCatEmoji(cat.name)}</Text>
                    )}
                    <Text style={styles.quickCatName} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Searches — from settings or defaults */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('popularSearches')}</Text>
            <View style={styles.chipsRow}>
              {popular.map((kw) => (
                <TouchableOpacity
                  key={kw}
                  style={styles.keywordChip}
                  onPress={() => { setQuery(kw); doSearch(kw); }}
                >
                  <Text style={styles.keywordChipText}>{kw}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ── Category emoji fallback ─────────────────────────────────── */

const CAT_EMOJI: Record<string, string> = {
  'Meat': '🥩', 'Fish': '🐟', 'Seafood': '🦐',
  'Dairy': '🥛', 'Milk': '🥛', 'Eggs': '🥚',
  'Bakery': '🍞', 'Rice': '🍚', 'Grains': '🌾',
  'Fruits': '🍎', 'Vegetables': '🥦',
  'Beverages': '🧃', 'Drinks': '🥤',
  'Personal Care': '🧴', 'Cleaning': '🧹',
  'Household': '🏠', 'Snacks': '🍿',
  'Frozen': '🧊', 'International': '🌍',
};

function getCatEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(CAT_EMOJI)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🛒';
}

/* ── Search Result Card ──────────────────────────────────────── */

function SearchResultCard({ item, currency }: { item: any; currency: string }) {
  const price      = item.discountPrice ?? item.price;
  const image      = item.images?.[0]?.url;
  const discountPct = item.discountPrice
    ? Math.round((1 - item.discountPrice / item.price) * 100) : 0;

  return (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push({ pathname: '/(customer)/product/[id]' as any, params: { id: item.id } })}
      activeOpacity={0.75}
    >
      <View style={styles.resultImageBox}>
        {image ? (
          <Image source={{ uri: image }} style={styles.resultImage} resizeMode="cover" />
        ) : (
          <View style={styles.resultImagePlaceholder}>
            <Ionicons name="cube-outline" size={28} color={Colors.textLight} />
          </View>
        )}
        {discountPct > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.resultCategory} numberOfLines={1}>
          {item.category?.name || item.seller?.storeName || ''}
        </Text>
        <View style={styles.resultPriceRow}>
          {item.discountPrice && (
            <Text style={styles.resultOriginalPrice}>
              {currency}{item.price?.toLocaleString()}
            </Text>
          )}
          <Text style={styles.resultPrice}>{currency}{price?.toLocaleString()}</Text>
        </View>
        {item.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.borderLight} />
    </TouchableOpacity>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn:      { padding: 4 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F5F5', borderRadius: BorderRadius.lg,
    paddingHorizontal: 12, height: 44,
  },
  searchInput:  { flex: 1, fontSize: FontSize.base, color: Colors.text },
  searchBtn:    { paddingHorizontal: 4 },
  searchBtnText:{ fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.bold },

  /* States */
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 10, padding: Spacing.lg,
  },
  emptyTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle:{ fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  browseBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
  },
  browseBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  /* Landing sections */
  section: {
    backgroundColor: Colors.surface, marginBottom: 8, paddingVertical: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text,
    paddingHorizontal: Spacing.lg, marginBottom: 10,
  },
  clearAll: { fontSize: FontSize.sm, color: Colors.textSecondary },

  /* History chips */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 8 },
  historyChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden',
  },
  chipInner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  chipText:  { fontSize: FontSize.sm, color: Colors.text, maxWidth: 120 },
  chipClose: {
    paddingHorizontal: 8, paddingVertical: 7,
    borderLeftWidth: 1, borderLeftColor: Colors.borderLight,
  },

  /* Keyword chips */
  keywordChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full,
  },
  keywordChipText: {
    fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium,
  },

  /* Categories grid */
  quickCats: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg, gap: 10,
  },
  quickCatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#F5F5F5', borderRadius: BorderRadius.lg,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
    maxWidth: '47%',
  },
  quickCatImg:   { width: 22, height: 22, borderRadius: 4 },
  quickCatEmoji: { fontSize: 18 },
  quickCatName:  { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium, flex: 1 },

  /* Result list */
  resultList: { backgroundColor: Colors.surface },
  separator:  { height: 1, backgroundColor: Colors.borderLight },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: 12,
  },
  resultImageBox: {
    width: 72, height: 72, borderRadius: BorderRadius.md,
    overflow: 'hidden', backgroundColor: Colors.surfaceVariant,
  },
  resultImage:          { width: '100%', height: '100%' },
  resultImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  discountBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: Colors.danger, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  discountText:         { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },
  resultInfo:           { flex: 1 },
  resultName:           { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 18 },
  resultCategory:       { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, marginBottom: 4 },
  resultPriceRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultOriginalPrice:  { fontSize: FontSize.xs, color: Colors.textLight, textDecorationLine: 'line-through' },
  resultPrice:          { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  ratingRow:            { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  ratingText:           { fontSize: 10, color: Colors.textSecondary },

  /* Suggestions dropdown */
  suggestionsContainer: {
    backgroundColor: Colors.surface, borderRadius: 12,
    marginHorizontal: Spacing.base, marginTop: 4,
    borderWidth: 1, borderColor: Colors.borderLight,
    overflow: 'hidden', zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  suggestionIcon: { marginRight: 10 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  suggestionSub:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  suggestionDivider: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 38 },
});
