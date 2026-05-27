import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Modal, FlatList, SafeAreaView as RNSafeArea,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import { useLanguage } from '../../../src/i18n';
import Toast from 'react-native-toast-message';

// KRW exchange rate: 1 unit of currency = X KRW (approximate)
const KRW_RATE: Record<string, number> = {
  KRW: 1, USD: 1350, EUR: 1460, GBP: 1720, CNY: 188,
  PKR: 4.8, BDT: 11.6, INR: 16.3, PHP: 23.5, IDR: 0.085,
  MYR: 290, NPR: 10.2, VND: 0.054, THB: 37.5, MMK: 0.64,
  ETB: 9.5, NGN: 0.88, GHS: 89, KES: 10.4, UZS: 0.106,
  SAR: 360, AED: 368, XOF: 2.24, LKR: 4.6, KHR: 0.33,
  RUB: 15, TRY: 42, EGP: 28, MAD: 134,
};

const COUNTRIES = [
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', callingCode: '+92', operators: ['Jazz', 'Telenor', 'Ufone', 'Zong'], amounts: [100, 200, 500, 1000, 2000] },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', callingCode: '+880', operators: ['Grameenphone', 'Robi', 'Banglalink', 'Airtel'], amounts: [50, 100, 200, 500, 1000] },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', callingCode: '+91', operators: ['Airtel', 'Jio', 'Vi', 'BSNL'], amounts: [50, 100, 200, 399, 499] },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', callingCode: '+63', operators: ['Globe', 'Smart', 'DITO'], amounts: [50, 100, 200, 300, 500] },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', callingCode: '+62', operators: ['Telkomsel', 'Indosat', 'XL', 'Tri'], amounts: [10000, 25000, 50000, 100000, 200000] },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', callingCode: '+60', operators: ['Maxis', 'Celcom', 'Digi', 'U Mobile'], amounts: [5, 10, 20, 30, 50] },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', currency: 'NPR', callingCode: '+977', operators: ['NTC', 'Ncell'], amounts: [50, 100, 200, 500, 1000] },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', callingCode: '+84', operators: ['Viettel', 'Mobifone', 'Vinaphone'], amounts: [20000, 50000, 100000, 200000, 500000] },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', callingCode: '+66', operators: ['AIS', 'DTAC', 'True Move'], amounts: [50, 100, 200, 300, 500] },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', currency: 'MMK', callingCode: '+95', operators: ['MPT', 'Ooredoo', 'Telenor', 'Mytel'], amounts: [1000, 2000, 5000, 10000, 20000] },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR', callingCode: '+94', operators: ['Dialog', 'Mobitel', 'Hutch', 'Airtel'], amounts: [50, 100, 200, 500, 1000] },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', currency: 'KHR', callingCode: '+855', operators: ['Metfone', 'Smart', 'Cellcard'], amounts: [1000, 2000, 5000, 10000, 20000] },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', callingCode: '+86', operators: ['China Mobile', 'China Unicom', 'China Telecom'], amounts: [10, 20, 50, 100, 200] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', callingCode: '+234', operators: ['MTN', 'Airtel', 'Glo', '9mobile'], amounts: [100, 200, 500, 1000, 2000] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', callingCode: '+233', operators: ['MTN', 'AirtelTigo', 'Vodafone'], amounts: [5, 10, 20, 50, 100] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', callingCode: '+254', operators: ['Safaricom', 'Airtel', 'Telkom'], amounts: [50, 100, 200, 500, 1000] },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB', callingCode: '+251', operators: ['Ethio Telecom'], amounts: [10, 25, 50, 100, 200] },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', currency: 'XOF', callingCode: '+221', operators: ['Orange', 'Free', 'Expresso'], amounts: [500, 1000, 2000, 5000, 10000] },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', currency: 'UZS', callingCode: '+998', operators: ['Ucell', 'Beeline', 'UMS'], amounts: [5000, 10000, 20000, 50000, 100000] },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', callingCode: '+966', operators: ['STC', 'Mobily', 'Zain'], amounts: [10, 20, 50, 100, 200] },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', callingCode: '+971', operators: ['Etisalat', 'Du'], amounts: [10, 20, 50, 100, 200] },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP', callingCode: '+20', operators: ['Vodafone', 'Etisalat', 'Orange'], amounts: [10, 20, 50, 100, 200] },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD', callingCode: '+212', operators: ['Maroc Telecom', 'Orange', 'Inwi'], amounts: [10, 20, 30, 50, 100] },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY', callingCode: '+90', operators: ['Turkcell', 'Vodafone', 'Türk Telekom'], amounts: [20, 50, 100, 200, 500] },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', currency: 'RUB', callingCode: '+7', operators: ['MTS', 'Beeline', 'MegaFon', 'Tele2'], amounts: [100, 200, 300, 500, 1000] },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', callingCode: '+1', operators: ['T-Mobile', 'AT&T', 'Verizon'], amounts: [10, 20, 30, 50, 100] },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', callingCode: '+44', operators: ['EE', 'O2', 'Vodafone', 'Three'], amounts: [5, 10, 15, 20, 30] },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', callingCode: '+33', operators: ['Orange', 'SFR', 'Bouygues', 'Free'], amounts: [5, 10, 20, 30, 50] },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', callingCode: '+49', operators: ['Telekom', 'Vodafone', 'O2'], amounts: [5, 10, 15, 20, 30] },
];

const LOCAL_AMOUNTS = [10000, 20000, 30000, 50000, 100000];
const LOCAL_OPERATORS = ['KT', 'SKT', 'LGU+'];

export default function TopupScreen() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'local' | 'intl'>('local');

  // Local state
  const [localOperator, setLocalOperator] = useState('KT');
  const [localPhone, setLocalPhone] = useState('');
  const [localAmount, setLocalAmount] = useState<number | null>(null);

  // International state
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedOperator, setSelectedOperator] = useState(COUNTRIES[0].operators[0]);
  const [intlPhone, setIntlPhone] = useState('');
  const [intlAmount, setIntlAmount] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.currency.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleLocalProceed = () => {
    if (!localPhone.trim()) { Toast.show({ type: 'error', text1: 'Enter phone number' }); return; }
    if (!localAmount) { Toast.show({ type: 'error', text1: 'Select an amount' }); return; }
    router.push({
      pathname: '/(customer)/topup/confirm',
      params: {
        type: 'local',
        countryCode: 'KR', countryName: 'South Korea', countryFlag: '🇰🇷',
        operator: localOperator, phone: localPhone,
        amount: String(localAmount), currency: 'KRW',
        krwRate: '1', totalKRW: String(localAmount),
      },
    });
  };

  const handleIntlProceed = () => {
    if (!intlPhone.trim()) { Toast.show({ type: 'error', text1: 'Enter phone number' }); return; }
    if (!intlAmount) { Toast.show({ type: 'error', text1: 'Select an amount' }); return; }
    const rate = KRW_RATE[selectedCountry.currency] || 1;
    const totalKRW = Math.round(intlAmount * rate);
    router.push({
      pathname: '/(customer)/topup/confirm',
      params: {
        type: 'international',
        countryCode: selectedCountry.code, countryName: selectedCountry.name,
        countryFlag: selectedCountry.flag, operator: selectedOperator,
        phone: `${selectedCountry.callingCode}${intlPhone}`,
        amount: String(intlAmount), currency: selectedCountry.currency,
        krwRate: String(rate), totalKRW: String(totalKRW),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('mobileTopUp')}</Text>
        <TouchableOpacity onPress={() => router.push('/(customer)/topup/history')} style={styles.historyBtn}>
          <Ionicons name="time-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'local' && styles.tabActive]}
          onPress={() => setTab('local')}
        >
          <Text style={[styles.tabText, tab === 'local' && styles.tabTextActive]}>🇰🇷 {t('localRecharge')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'intl' && styles.tabActive]}
          onPress={() => setTab('intl')}
        >
          <Text style={[styles.tabText, tab === 'intl' && styles.tabTextActive]}>🌍 {t('international')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tab === 'local' ? (
          /* ── LOCAL (Korea) ── */
          <View style={styles.card}>
            {/* Operator */}
            <Text style={styles.label}>{t('mobileOperator')}</Text>
            <View style={styles.chipRow}>
              {LOCAL_OPERATORS.map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[styles.chip, localOperator === op && styles.chipActive]}
                  onPress={() => setLocalOperator(op)}
                >
                  <Text style={[styles.chipText, localOperator === op && styles.chipTextActive]}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Phone */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>{t('phoneToTopUp')}</Text>
            <View style={styles.phoneRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>🇰🇷 +82</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={localPhone}
                onChangeText={setLocalPhone}
                placeholder="010-0000-0000"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            {/* Amounts */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>{t('amountKRW')}</Text>
            <View style={styles.amountGrid}>
              {LOCAL_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.amountChip, localAmount === a && styles.amountChipActive]}
                  onPress={() => setLocalAmount(a)}
                >
                  <Text style={[styles.amountText, localAmount === a && styles.amountTextActive]}>
                    ₩{a.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary */}
            {localAmount !== null && (
              <View style={styles.summary}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>{t('totalCharge')}</Text>
                  <Text style={styles.sumValue}>₩{localAmount.toLocaleString()}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.proceedBtn} onPress={handleLocalProceed}>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.proceedText}>{t('proceedPayment')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── INTERNATIONAL ── */
          <View style={styles.card}>
            {/* Country */}
            <Text style={styles.label}>{t('selectCountry')}</Text>
            <TouchableOpacity style={styles.countryBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.countryName}>{selectedCountry.name}</Text>
                <Text style={styles.countryCurrency}>{selectedCountry.currency} • {selectedCountry.callingCode}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            {/* Operator */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>{t('mobileOperator')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRowScroll}>
              {selectedCountry.operators.map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[styles.chip, selectedOperator === op && styles.chipActive]}
                  onPress={() => setSelectedOperator(op)}
                >
                  <Text style={[styles.chipText, selectedOperator === op && styles.chipTextActive]}>{op}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Phone */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>{t('phoneToTopUp')}</Text>
            <View style={styles.phoneRow}>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{selectedCountry.flag} {selectedCountry.callingCode}</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={intlPhone}
                onChangeText={setIntlPhone}
                placeholder="Enter number"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            {/* Amounts */}
            <Text style={[styles.label, { marginTop: Spacing.lg }]}>
              {t('selectAmount')} ({selectedCountry.currency})
            </Text>
            <View style={styles.amountGrid}>
              {selectedCountry.amounts.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.amountChip, intlAmount === a && styles.amountChipActive]}
                  onPress={() => setIntlAmount(a)}
                >
                  <Text style={[styles.amountText, intlAmount === a && styles.amountTextActive]}>
                    {a.toLocaleString()} {selectedCountry.currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary */}
            {intlAmount !== null && (
              <View style={styles.summary}>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>{t('exchangeRate')}</Text>
                  <Text style={styles.sumValue}>1 {selectedCountry.currency} ≈ ₩{(KRW_RATE[selectedCountry.currency] || 1).toLocaleString()}</Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>{t('totalCharge')}</Text>
                  <Text style={[styles.sumValue, { color: Colors.topup, fontSize: FontSize.lg, fontWeight: FontWeight.bold }]}>
                    ₩{Math.round(intlAmount * (KRW_RATE[selectedCountry.currency] || 1)).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.proceedBtn} onPress={handleIntlProceed}>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.proceedText}>{t('proceedPayment')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.historyCard} onPress={() => router.push('/(customer)/topup/history')}>
          <Ionicons name="time-outline" size={20} color={Colors.topup} />
          <Text style={styles.historyText}>{t('viewHistory')}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.topup} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <RNSafeArea style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('selectCountry')}</Text>
            <TouchableOpacity onPress={() => { setShowPicker(false); setCountrySearch(''); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearch}>
            <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.modalSearchInput}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder={t('searchCountries')}
              placeholderTextColor={Colors.textLight}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, selectedCountry.code === item.code && styles.countryItemActive]}
                onPress={() => {
                  setSelectedCountry(item);
                  setSelectedOperator(item.operators[0]);
                  setIntlAmount(null);
                  setShowPicker(false);
                  setCountrySearch('');
                }}
              >
                <Text style={styles.itemFlag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSub}>{item.currency} • {item.callingCode}</Text>
                </View>
                {selectedCountry.code === item.code && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.topup} />
                )}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </RNSafeArea>
      </Modal>
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
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  historyBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  tabs: {
    flexDirection: 'row', margin: Spacing.base, marginBottom: 0,
    backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: Colors.topup },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  scroll: { padding: Spacing.base, paddingTop: Spacing.sm },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, ...Shadow.md, marginBottom: Spacing.base,
  },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipRowScroll: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceVariant,
  },
  chipActive: { backgroundColor: Colors.topup, borderColor: Colors.topup },
  chipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  codeBox: {
    paddingHorizontal: Spacing.base, height: 52,
    backgroundColor: Colors.surfaceVariant, justifyContent: 'center',
    borderRightWidth: 1, borderRightColor: Colors.border,
  },
  codeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  phoneInput: { flex: 1, height: 52, paddingHorizontal: Spacing.base, fontSize: FontSize.base, color: Colors.text },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amountChip: {
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceVariant, minWidth: 90, alignItems: 'center',
  },
  amountChipActive: { backgroundColor: Colors.topup, borderColor: Colors.topup },
  amountText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  amountTextActive: { color: '#fff' },
  summary: {
    backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg,
    padding: Spacing.base, marginTop: Spacing.base,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sumLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sumValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.topup, height: 54, borderRadius: BorderRadius['2xl'],
    marginTop: Spacing.lg, ...Shadow.md,
  },
  proceedText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  historyCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    backgroundColor: Colors.topupLight, borderRadius: BorderRadius.lg,
    padding: Spacing.base, borderWidth: 1.5, borderColor: Colors.topup,
  },
  historyText: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.topup },
  countryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    padding: Spacing.base, backgroundColor: Colors.surfaceVariant,
  },
  countryFlag: { fontSize: 28 },
  countryName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  countryCurrency: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  modalSearch: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.base, paddingHorizontal: Spacing.base, height: 46,
    backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg,
  },
  modalSearchInput: { flex: 1, fontSize: FontSize.base, color: Colors.text },
  countryItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  countryItemActive: { backgroundColor: Colors.topupLight },
  itemFlag: { fontSize: 28 },
  itemName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  itemSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
});
