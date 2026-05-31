/**
 * SIM Numbers — Customer side
 *
 * Two modes:
 *  1. Browse All  — shows every AVAILABLE number the admin added (full list, filterable)
 *  2. Request Last-4 — customer picks a PREFIX number and types their preferred last 4 digits
 *
 * On "Reserve" → goes to reserve.tsx which handles ID upload + order tracking.
 */
import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { simApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import Toast from 'react-native-toast-message';
import { useBranding } from '../../../src/context/BrandingContext';
import { useLanguage } from '../../../src/i18n';

/* ─── constants ──────────────────────────────────────────────── */
const CARRIERS = ['All', 'SKT', 'KT', 'LG_UPLUS', 'MVNO'];
const SIM_TYPES = ['All', 'PREPAID', 'DATA_ONLY', 'VOICE_DATA'];
const CARRIER_LABELS: Record<string, string> = { SKT: 'SKT', KT: 'KT', LG_UPLUS: 'LG U+', MVNO: 'MVNO' };
const CARRIER_COLORS: Record<string, string> = {
  SKT: '#E31E24', KT: '#E31E24', LG_UPLUS: '#BC257E', MVNO: '#6B7280',
};

/* ─── helpers ────────────────────────────────────────────────── */
function fmtPrice(n: number, currency: string) {
  return `${currency}${n?.toLocaleString() ?? '0'}`;
}

/* ─── SimCard row ────────────────────────────────────────────── */
const SimRow = memo(function SimRow({
  item, currency, onSelect,
}: { item: any; currency: string; onSelect: (item: any) => void }) {
  const { t } = useLanguage();
  const isPrefixMode = !!item.customerChoosesLastFour;
  return (
    <TouchableOpacity style={styles.simRow} onPress={() => onSelect(item)} activeOpacity={0.85}>
      <View style={[styles.carrierDot, { backgroundColor: CARRIER_COLORS[item.carrier] || '#6B7280' }]} />
      <View style={styles.simRowBody}>
        <Text style={styles.simRowNumber}>
          {isPrefixMode ? (item.maskedNumber || `${item.numberPrefix}-????`) : (item.maskedNumber || '010-????-????')}
        </Text>
        <View style={styles.simRowTags}>
          <View style={[styles.tag, { backgroundColor: CARRIER_COLORS[item.carrier] + '20' }]}>
            <Text style={[styles.tagText, { color: CARRIER_COLORS[item.carrier] || '#6B7280' }]}>
              {CARRIER_LABELS[item.carrier] || item.carrier}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {item.simType === 'PREPAID' ? t('simTypePrepaid') : item.simType === 'DATA_ONLY' ? t('simTypeDataOnly') : item.simType === 'VOICE_DATA' ? t('simTypeVoiceData') : item.simType}
            </Text>
          </View>
          {isPrefixMode && (
            <View style={[styles.tag, { backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.tagText, { color: '#F97316' }]}>{t('canChooseNumber')}</Text>
            </View>
          )}
          {item.requiresIdVerification && (
            <View style={[styles.tag, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={10} color={Colors.primary} />
              <Text style={[styles.tagText, { color: Colors.primary }]}> {t('idRequired')}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.simRowRight}>
        <Text style={styles.simRowPrice}>{fmtPrice(item.price, currency)}</Text>
        <View style={styles.selectBtn}>
          <Text style={styles.selectBtnText}>{isPrefixMode ? t('selectNumber') : t('reserveNumber')}</Text>
          <Ionicons name="arrow-forward" size={12} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

/* ─── Last-4 picker modal (for prefix-mode numbers) ─────────── */
function LastFourModal({
  visible, item, currency,
  onClose, onConfirm,
}: {
  visible: boolean; item: any | null; currency: string;
  onClose: () => void; onConfirm: (item: any, lastFour: string) => void;
}) {
  const { t } = useLanguage();
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef<TextInput[]>([]);

  useEffect(() => { if (visible) setDigits(['', '', '', '']); }, [visible]);

  const handleChange = (val: string, i: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 3) refs.current[i + 1]?.focus();
    if (!val && i > 0) refs.current[i - 1]?.focus();
  };

  const complete = digits.every(Boolean);

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={modal.sheet}>
        <View style={modal.handle} />
        <Text style={modal.title}>{t('chooseLastFour')}</Text>
        <Text style={modal.subtitle}>
          {item.maskedNumber || `${item.numberPrefix}-????`}
          {' → '}
          <Text style={{ color: Colors.sim, fontWeight: '800' }}>
            {item.numberPrefix ? `${item.numberPrefix.slice(0,3)}-${item.numberPrefix.slice(3,7)}-` : '010-XXXX-'}
            {digits.map((d) => d || '?').join('')}
          </Text>
        </Text>

        <View style={modal.digitRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { if (r) refs.current[i] = r; }}
              style={[modal.digitBox, d ? modal.digitBoxFilled : {}]}
              value={d}
              onChangeText={(v) => handleChange(v, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              placeholder={(i + 1).toString()}
              placeholderTextColor={Colors.textLight}
            />
          ))}
        </View>

        <View style={modal.priceRow}>
          <Text style={modal.priceLabel}>{t('price')}</Text>
          <Text style={modal.priceValue}>{fmtPrice(item.price, currency)}</Text>
        </View>

        <TouchableOpacity
          style={[modal.confirmBtn, !complete && modal.disabled]}
          disabled={!complete}
          onPress={() => onConfirm(item, digits.join(''))}
        >
          <Text style={modal.confirmText}>{t('proceedReservation')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={modal.cancelBtn} onPress={onClose}>
          <Text style={modal.cancelText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/* ─── Main Screen ────────────────────────────────────────────── */
export default function SimScreen() {
  const { currency } = useBranding();
  const { t } = useLanguage();

  // Tab: 'browse' = all numbers, 'search' = by last-4
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse');

  // Browse state
  const [numbers, setNumbers]       = useState<any[]>([]);
  const [browsing, setBrowsing]     = useState(false);
  const [browseLoaded, setBrowseLoaded] = useState(false);

  // Search state
  const [digits, setDigits]         = useState(['', '', '', '']);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]   = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Shared filters
  const [selectedCarrier, setSelectedCarrier] = useState('All');
  const [selectedType, setSelectedType]       = useState('All');

  // Last-four modal
  const [modalItem, setModalItem] = useState<any | null>(null);

  const inputRefs = useRef<TextInput[]>([]);

  /* ── load all available numbers ── */
  const loadNumbers = useCallback(async () => {
    setBrowsing(true);
    try {
      const carrier = selectedCarrier !== 'All' ? selectedCarrier : undefined;
      const simType = selectedType   !== 'All' ? selectedType   : undefined;
      const res = await simApi.getAvailable({ carrier, simType, limit: 50 });
      const data = res.data;
      const list: any[] = Array.isArray(data) ? data
        : (data?.numbers ?? data?.data ?? []);
      setNumbers(list);
      setBrowseLoaded(true);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('serverError') });
    } finally {
      setBrowsing(false);
    }
  }, [selectedCarrier, selectedType]);

  /* ── search by last-4 ── */
  const handleSearch = async () => {
    const lastFour = digits.join('');
    if (lastFour.length !== 4) {
      Toast.show({ type: 'info', text1: t('enterAllFour') });
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const carrier = selectedCarrier !== 'All' ? selectedCarrier : undefined;
      const simType = selectedType   !== 'All' ? selectedType   : undefined;
      const res = await simApi.search(lastFour, carrier, simType);
      const d = res.data;
      setSearchResults(Array.isArray(d) ? d : (d?.numbers ?? []));
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('serverError') });
    } finally {
      setSearching(false);
    }
  };

  /* ── on tab switch, auto-load browse ── */
  useEffect(() => {
    if (activeTab === 'browse' && !browseLoaded) loadNumbers();
  }, [activeTab, browseLoaded, loadNumbers]);

  /* ── re-load when filters change ── */
  useEffect(() => {
    if (activeTab === 'browse') {
      setBrowseLoaded(false);
      loadNumbers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCarrier, selectedType]);

  /* on mount: load browse */
  useEffect(() => { loadNumbers(); }, []); // eslint-disable-line

  const handleDigitChange = (val: string, i: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 3) inputRefs.current[i + 1]?.focus();
    if (!val && i > 0) inputRefs.current[i - 1]?.focus();
  };

  /* ── when user selects a number ── */
  const handleSelect = (item: any) => {
    if (item.customerChoosesLastFour) {
      // prefix-mode: ask for last 4 first
      setModalItem(item);
    } else {
      // full number: go straight to reserve
      router.push({
        pathname: '/(customer)/sim/reserve' as any,
        params: {
          simId:   item.id,
          number:  item.maskedNumber,
          carrier: item.carrier,
          simType: item.simType,
          price:   String(item.price),
        },
      });
    }
  };

  /* ── when last-4 confirmed for prefix number ── */
  const handleLastFourConfirm = (item: any, lastFour: string) => {
    setModalItem(null);
    router.push({
      pathname: '/(customer)/sim/reserve' as any,
      params: {
        simId:       item.id,
        number:      `${item.numberPrefix?.slice(0,3)}-${item.numberPrefix?.slice(3,7)}-${lastFour}`,
        carrier:     item.carrier,
        simType:     item.simType,
        price:       String(item.price),
        chosenLastFour: lastFour,
      },
    });
  };

  const getSimTypeLabel = (tp: string) => {
    if (tp === 'DATA_ONLY') return t('simTypeDataOnly');
    if (tp === 'VOICE_DATA') return t('simTypeVoiceData');
    if (tp === 'PREPAID') return t('simTypePrepaid');
    return tp;
  };

  const displayList = activeTab === 'browse' ? numbers : searchResults;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('simPageTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.tabActive]}
          onPress={() => setActiveTab('browse')}
        >
          <Ionicons name="list-outline" size={16} color={activeTab === 'browse' ? Colors.sim : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.tabTextActive]}>{t('browseAllNumbers')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons name="search-outline" size={16} color={activeTab === 'search' ? Colors.sim : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>{t('searchNumbers')}</Text>
        </TouchableOpacity>
      </View>

      {/* Filters (shared) */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CARRIERS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, selectedCarrier === c && styles.chipActive]}
              onPress={() => setSelectedCarrier(c)}
            >
              <Text style={[styles.chipText, selectedCarrier === c && styles.chipTextActive]}>
                {c === 'All' ? t('all') : c === 'LG_UPLUS' ? 'LG U+' : c}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.chipDivider} />
          {SIM_TYPES.map((tp) => (
            <TouchableOpacity
              key={tp}
              style={[styles.chip, selectedType === tp && styles.chipActive]}
              onPress={() => setSelectedType(tp)}
            >
              <Text style={[styles.chipText, selectedType === tp && styles.chipTextActive]}>
                {tp === 'All' ? t('all') : getSimTypeLabel(tp)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── BROWSE TAB ── */}
      {activeTab === 'browse' && (
        <>
          {browsing ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.sim} />
              <Text style={styles.loadingText}>{t('loadingNumbers')}</Text>
            </View>
          ) : numbers.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="phone-portrait-outline" size={56} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>{t('noNumbersAdded')}</Text>
              <Text style={styles.emptyText}>{t('adminWillAdd')}</Text>
              <TouchableOpacity style={styles.reloadBtn} onPress={loadNumbers}>
                <Ionicons name="refresh-outline" size={16} color={Colors.sim} />
                <Text style={styles.reloadText}>{t('refresh')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={numbers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SimRow item={item} currency={currency} onSelect={handleSelect} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listCount}>{t('numbersAvailable', { count: numbers.length })}</Text>
                  <TouchableOpacity onPress={loadNumbers}>
                    <Ionicons name="refresh-outline" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              }
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </>
      )}

      {/* ── SEARCH TAB ── */}
      {activeTab === 'search' && (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.searchCard}>
            <Text style={styles.searchTitle}>{t('preferredLastFour')}</Text>
            <Text style={styles.searchHint}>
              {t('phoneFormat')}<Text style={{ color: Colors.sim, fontWeight: '800', letterSpacing: 2 }}>????</Text>
            </Text>
            <View style={styles.digitRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { if (r) inputRefs.current[i] = r; }}
                  style={[styles.digitBox, d ? styles.digitBoxFilled : {}]}
                  value={d}
                  onChangeText={(v) => handleDigitChange(v, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  placeholder={(i + 1).toString()}
                  placeholderTextColor={Colors.textLight}
                />
              ))}
            </View>

            <View style={styles.searchBtnRow}>
              {digits.some(Boolean) && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setDigits(['', '', '', '']); setHasSearched(false); setSearchResults([]); }}
                >
                  <Text style={styles.clearText}>{t('clearInput')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.searchBtn, searching && styles.disabled]}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="search" size={16} color="#fff" /><Text style={styles.searchBtnText}>{t('searchNumbers')}</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>

          {hasSearched && (
            <View style={styles.searchResults}>
              <Text style={styles.resultsTitle}>
                {searchResults.length > 0
                  ? t('searchResultsCount', { count: searchResults.length })
                  : t('noSearchResults')}
              </Text>
              {searchResults.length === 0 ? (
                <View style={styles.centered}>
                  <Ionicons name="search-outline" size={40} color={Colors.textLight} />
                  <Text style={styles.emptyText}>{t('tryOtherDigits')}</Text>
                </View>
              ) : (
                searchResults.map((item) => (
                  <SimRow key={item.id} item={item} currency={currency} onSelect={handleSelect} />
                ))
              )}
            </View>
          )}

          {/* How it works */}
          <View style={styles.howBox}>
            <Text style={styles.howTitle}>{t('howItWorks')}</Text>
            {[
              { n: '1', text: `${t('step1Title')} — ${t('step1Desc')}` },
              { n: '2', text: `${t('step2Title')} — ${t('step2Desc')}` },
              { n: '3', text: `${t('step3Title')} — ${t('step3Desc')}` },
              { n: '4', text: `${t('step4Title')} — ${t('step4Desc')}` },
            ].map((s) => (
              <View key={s.n} style={styles.howRow}>
                <View style={styles.howBullet}><Text style={styles.howBulletText}>{s.n}</Text></View>
                <Text style={styles.howText}>{s.text}</Text>
              </View>
            ))}
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Last-four picker modal */}
      <LastFourModal
        visible={!!modalItem}
        item={modalItem}
        currency={currency}
        onClose={() => setModalItem(null)}
        onConfirm={handleLastFourConfirm}
      />
    </SafeAreaView>
  );
}

/* ─── styles ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },

  tabBar:   { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive:{ borderBottomWidth: 2.5, borderBottomColor: Colors.sim },
  tabText:  { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  tabTextActive: { color: Colors.sim },

  filterWrap: { backgroundColor: Colors.surface, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  filterRow:  { paddingHorizontal: Spacing.base, gap: 6 },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceVariant },
  chipActive: { backgroundColor: Colors.sim, borderColor: Colors.sim },
  chipText:   { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  chipDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: Spacing.lg },
  loadingText: { marginTop: 12, fontSize: FontSize.sm, color: Colors.textSecondary },
  emptyTitle:  { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyText:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  reloadBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.sim },
  reloadText:  { color: Colors.sim, fontWeight: FontWeight.semibold },

  listContent:   { paddingHorizontal: Spacing.base, paddingBottom: 24, paddingTop: 4 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  listCount:     { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  separator:     { height: 1, backgroundColor: Colors.borderLight },

  /* SIM row */
  simRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingVertical: 14, paddingHorizontal: 12, gap: 10,
  },
  carrierDot:  { width: 8, height: 8, borderRadius: 4 },
  simRowBody:  { flex: 1 },
  simRowNumber:{ fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, fontFamily: 'monospace', letterSpacing: 0.5 },
  simRowTags:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  tag:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceVariant },
  tagText:     { fontSize: 10, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  simRowRight: { alignItems: 'flex-end', gap: 6 },
  simRowPrice: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: Colors.sim },
  selectBtn:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.sim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  selectBtnText:{ fontSize: 11, color: '#fff', fontWeight: FontWeight.bold },

  /* Search tab */
  searchCard: { margin: Spacing.base, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.sm },
  searchTitle:{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 4 },
  searchHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  digitRow:   { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: Spacing.lg },
  digitBox:   {
    width: 62, height: 70, borderRadius: BorderRadius.lg, borderWidth: 2.5, borderColor: Colors.border,
    textAlign: 'center', fontSize: 28, fontWeight: FontWeight.bold, color: Colors.text,
    backgroundColor: Colors.surface, ...Shadow.sm,
  },
  digitBoxFilled: { borderColor: Colors.sim, backgroundColor: Colors.simLight, color: Colors.sim },
  searchBtnRow:   { flexDirection: 'row', gap: 8 },
  clearBtn:       { paddingHorizontal: 20, height: 48, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  clearText:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  searchBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: BorderRadius['2xl'], backgroundColor: Colors.sim, gap: 6 },
  disabled:       { opacity: 0.6 },
  searchBtnText:  { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },

  searchResults:{ paddingHorizontal: Spacing.base },
  resultsTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 8 },

  howBox:   { margin: Spacing.base, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  howTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 12 },
  howRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  howBullet:{ width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.sim, justifyContent: 'center', alignItems: 'center' },
  howBulletText: { color: '#fff', fontSize: 12, fontWeight: FontWeight.bold },
  howText:  { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
});

/* ─── modal styles ───────────────────────────────────────────── */
const modal = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:       {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 },
  title:       { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: 6, textAlign: 'center' },
  subtitle:    { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  digitRow:    { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 24 },
  digitBox:    {
    width: 64, height: 72, borderRadius: BorderRadius.lg, borderWidth: 2.5, borderColor: Colors.border,
    textAlign: 'center', fontSize: 28, fontWeight: FontWeight.bold, color: Colors.text,
    backgroundColor: Colors.surface,
  },
  digitBoxFilled: { borderColor: Colors.sim, backgroundColor: Colors.simLight, color: Colors.sim },
  priceRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginBottom: 20 },
  priceLabel:  { fontSize: FontSize.base, color: Colors.textSecondary },
  priceValue:  { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.sim },
  confirmBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, backgroundColor: Colors.sim, borderRadius: BorderRadius['2xl'], marginBottom: 12 },
  disabled:    { opacity: 0.5 },
  confirmText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  cancelBtn:   { alignItems: 'center', padding: 12 },
  cancelText:  { color: Colors.textSecondary, fontSize: FontSize.base },
});
