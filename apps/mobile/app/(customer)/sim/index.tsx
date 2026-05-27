import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { simApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import Toast from 'react-native-toast-message';

const CARRIERS = ['All', 'SKT', 'KT', 'LG_UPLUS', 'MVNO'];
const SIM_TYPES = ['All', 'PREPAID', 'DATA_ONLY', 'VOICE_DATA'];
const CARRIER_LABELS: Record<string, string> = { SKT: 'SKT', KT: 'KT', LG_UPLUS: 'LG U+', MVNO: 'MVNO' };
const CARRIER_COLORS: Record<string, string> = { SKT: '#E31E24', KT: '#E31E24', LG_UPLUS: '#BC257E', MVNO: '#6B7280' };

export default function SimScreen() {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [selectedCarrier, setSelectedCarrier] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  const handleDigitChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    if (!value && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleSearch = async () => {
    const lastFour = digits.join('');
    if (lastFour.length !== 4) {
      Toast.show({ type: 'error', text1: 'Please enter all 4 digits' });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const carrier = selectedCarrier !== 'All' ? selectedCarrier : undefined;
      const simType = selectedType !== 'All' ? selectedType : undefined;
      const res = await simApi.search(lastFour, carrier, simType);
      setResults(res.data.numbers);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setDigits(['', '', '', '']);
    setResults([]);
    setHasSearched(false);
    inputRefs.current[0]?.focus();
  };

  const handleBrowseAll = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const carrier = selectedCarrier !== 'All' ? selectedCarrier : undefined;
      const simType = selectedType !== 'All' ? selectedType : undefined;
      const res = await simApi.getAvailable({ carrier, simType });
      setResults(res.data.numbers || res.data);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to load numbers' });
    } finally {
      setIsSearching(false);
    }
  };

  const renderSimCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.simCard}
      onPress={() => router.push({ pathname: '/(customer)/sim/reserve', params: { simId: item.id } })}
    >
      <View style={styles.simCardLeft}>
        <View style={[styles.carrierBadge, { backgroundColor: CARRIER_COLORS[item.carrier] || '#6B7280' }]}>
          <Text style={styles.carrierText}>{CARRIER_LABELS[item.carrier] || item.carrier}</Text>
        </View>
        <Text style={styles.simNumber}>{item.maskedNumber}</Text>
        <View style={styles.simTypeBadge}>
          <Text style={styles.simTypeText}>
            {item.simType === 'PREPAID' ? 'Prepaid' : item.simType === 'DATA_ONLY' ? 'Data Only' : 'Voice + Data'}
          </Text>
        </View>
        {item.requiresIdVerification && (
          <View style={styles.idRequired}>
            <Ionicons name="shield-checkmark-outline" size={12} color={Colors.info} />
            <Text style={styles.idRequiredText}>ID verification required</Text>
          </View>
        )}
      </View>
      <View style={styles.simCardRight}>
        <Text style={styles.simPrice}>₩{item.price?.toLocaleString()}</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => router.push({ pathname: '/(customer)/sim/reserve', params: { simId: item.id } })}
        >
          <Text style={styles.selectText}>Select</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prepaid SIM Cards</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="phone-portrait" size={28} color={Colors.sim} />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Find Your Perfect Number</Text>
            <Text style={styles.infoSubtitle}>Enter your preferred last 4 digits below</Text>
          </View>
        </View>

        {/* Last 4 Digits Input */}
        <View style={styles.searchSection}>
          <Text style={styles.searchLabel}>Choose Last 4 Digits</Text>
          <Text style={styles.searchHint}>Format: 010-XXXX-<Text style={styles.hintHighlight}>????</Text></Text>

          <View style={styles.digitInputRow}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { if (ref) inputRefs.current[index] = ref; }}
                style={[styles.digitInput, digit ? styles.digitFilled : {}]}
                value={digit}
                onChangeText={(val) => handleDigitChange(val, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                placeholder={String(index + 1)}
                placeholderTextColor={Colors.textLight}
              />
            ))}
          </View>

          {/* Filter Row */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Carrier</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {CARRIERS.map((carrier) => (
                <TouchableOpacity
                  key={carrier}
                  style={[styles.filterChip, selectedCarrier === carrier && styles.filterChipActive]}
                  onPress={() => setSelectedCarrier(carrier)}
                >
                  <Text style={[styles.filterChipText, selectedCarrier === carrier && styles.filterChipTextActive]}>
                    {carrier === 'LG_UPLUS' ? 'LG U+' : carrier}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>SIM Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {SIM_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                    {type === 'DATA_ONLY' ? 'Data Only' : type === 'VOICE_DATA' ? 'Voice + Data' : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.buttonRow}>
            {digits.some(Boolean) && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.disabled]}
              onPress={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#fff" />
                  <Text style={styles.searchButtonText}>Search Numbers</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        {hasSearched && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {results.length > 0 ? `${results.length} number${results.length === 1 ? '' : 's'} found` : 'No numbers found'}
              </Text>
            </View>

            {results.length === 0 && !isSearching ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color={Colors.textLight} />
                <Text style={styles.noResultsTitle}>No numbers available</Text>
                <Text style={styles.noResultsText}>Try different last 4 digits or check back later</Text>
              </View>
            ) : (
              results.map((item) => renderSimCard({ item }))
            )}
          </View>
        )}

        {/* Browse All */}
        <View style={styles.browseSection}>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={handleBrowseAll}
          >
            <Ionicons name="grid-outline" size={20} color={Colors.sim} />
            <Text style={styles.browseText}>Browse All Available Numbers</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.sim} />
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <View style={styles.howSection}>
          <Text style={styles.howTitle}>How It Works</Text>
          {[
            { step: '1', icon: 'search-outline', title: 'Search Your Number', desc: 'Enter your preferred last 4 digits or browse all' },
            { step: '2', icon: 'hand-left-outline', title: 'Reserve It', desc: 'Hold the number for 15 minutes while you complete the order' },
            { step: '3', icon: 'document-outline', title: 'Submit ID', desc: 'Upload required identity documents (Korean law requirement)' },
            { step: '4', icon: 'cube-outline', title: 'Receive SIM', desc: 'Admin verifies and ships your SIM card to your address' },
          ].map((item) => (
            <View key={item.step} style={styles.howItem}>
              <View style={styles.howStep}>
                <Text style={styles.howStepText}>{item.step}</Text>
              </View>
              <Ionicons name={item.icon as any} size={24} color={Colors.sim} style={styles.howIcon} />
              <View style={styles.howContent}>
                <Text style={styles.howItemTitle}>{item.title}</Text>
                <Text style={styles.howItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    margin: Spacing.lg, padding: Spacing.base,
    backgroundColor: Colors.simLight, borderRadius: BorderRadius.lg,
    borderLeftWidth: 4, borderLeftColor: Colors.sim,
  },
  infoText: { flex: 1 },
  infoTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.sim },
  infoSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  searchSection: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.md,
    marginBottom: Spacing.lg,
  },
  searchLabel: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  searchHint: { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing.lg },
  hintHighlight: { color: Colors.sim, fontWeight: FontWeight.bold, letterSpacing: 2 },
  digitInputRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: Spacing.lg },
  digitInput: {
    width: 64, height: 72, borderRadius: BorderRadius.lg,
    borderWidth: 2.5, borderColor: Colors.border,
    textAlign: 'center', fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold, color: Colors.text,
    backgroundColor: Colors.surface, ...Shadow.sm,
  },
  digitFilled: { borderColor: Colors.sim, backgroundColor: Colors.simLight, color: Colors.sim },
  filterSection: { marginBottom: Spacing.lg, gap: Spacing.xs },
  filterLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surfaceVariant,
  },
  filterChipActive: { backgroundColor: Colors.sim, borderColor: Colors.sim },
  filterChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  clearButton: {
    paddingHorizontal: Spacing.lg, height: 50,
    borderRadius: BorderRadius['2xl'], justifyContent: 'center',
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  clearText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  searchButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: BorderRadius['2xl'], backgroundColor: Colors.sim, gap: 8, ...Shadow.sm,
  },
  disabled: { opacity: 0.7 },
  searchButtonText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  resultsSection: { paddingHorizontal: Spacing.lg },
  resultsHeader: { marginBottom: Spacing.sm },
  resultsTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  simCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.base, marginBottom: 10, ...Shadow.sm,
    borderWidth: 1.5, borderColor: Colors.borderLight,
  },
  simCardLeft: { flex: 1 },
  carrierBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full, marginBottom: 6 },
  carrierText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  simNumber: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text, fontFamily: 'monospace', letterSpacing: 1 },
  simTypeBadge: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: Colors.simLight, borderRadius: BorderRadius.sm },
  simTypeText: { fontSize: FontSize.xs, color: Colors.sim, fontWeight: FontWeight.semibold },
  idRequired: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  idRequiredText: { fontSize: FontSize.xs, color: Colors.info },
  simCardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  simPrice: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.sim },
  selectButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.sim, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BorderRadius['2xl'],
  },
  selectText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  noResults: { alignItems: 'center', padding: Spacing['3xl'] },
  noResultsTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing.lg },
  noResultsText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
  browseSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  browseButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    backgroundColor: Colors.simLight, borderRadius: BorderRadius.lg,
    padding: Spacing.base, borderWidth: 1.5, borderColor: Colors.sim,
  },
  browseText: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.sim },
  howSection: { marginHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.sm },
  howTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.lg },
  howItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.base, marginBottom: Spacing.base },
  howStep: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.sim, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  howStepText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  howIcon: { marginTop: 2 },
  howContent: { flex: 1 },
  howItemTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  howItemDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
