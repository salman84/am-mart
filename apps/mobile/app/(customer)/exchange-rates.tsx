import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Linking, Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { exchangeRateApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';

const CURRENCIES = [
  { code: 'KRW', name: 'Korean Won',          flag: '🇰🇷' },
  { code: 'PHP', name: 'Philippine Peso',     flag: '🇵🇭' },
  { code: 'BDT', name: 'Bangladeshi Taka',    flag: '🇧🇩' },
  { code: 'NPR', name: 'Nepalese Rupee',      flag: '🇳🇵' },
  { code: 'VND', name: 'Vietnamese Dong',     flag: '🇻🇳' },
  { code: 'INR', name: 'Indian Rupee',        flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee',     flag: '🇵🇰' },
  { code: 'MMK', name: 'Myanmar Kyat',        flag: '🇲🇲' },
  { code: 'IDR', name: 'Indonesian Rupiah',   flag: '🇮🇩' },
  { code: 'THB', name: 'Thai Baht',           flag: '🇹🇭' },
  { code: 'USD', name: 'US Dollar',           flag: '🇺🇸' },
  { code: 'CNY', name: 'Chinese Yuan',        flag: '🇨🇳' },
  { code: 'JPY', name: 'Japanese Yen',        flag: '🇯🇵' },
  { code: 'MYR', name: 'Malaysian Ringgit',   flag: '🇲🇾' },
  { code: 'EUR', name: 'Euro',                flag: '🇪🇺' },
];

const UNIQUE_CURRENCIES = CURRENCIES;

function formatAmount(amount: number, code: string): string {
  if (isNaN(amount)) return '—';
  if (amount >= 1000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return amount.toFixed(4);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ExchangeRatesScreen() {
  const { t, language } = useLanguage();

  const [sendCurrency, setSendCurrency] = useState('KRW');
  const [recvCurrency, setRecvCurrency] = useState('PHP');
  const [amount, setAmount] = useState('100000');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSendPicker, setShowSendPicker] = useState(false);
  const [showRecvPicker, setShowRecvPicker] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const getCurrencyInfo = (code: string) =>
    UNIQUE_CURRENCIES.find((c) => c.code === code) ?? { code, name: code, flag: '💱' };

  const fetchRates = useCallback(async (send = sendCurrency, recv = recvCurrency, amt = amount) => {
    setLoading(true);
    try {
      const res = await exchangeRateApi.compare(send, recv, parseFloat(amt) || undefined);
      setResults(res.data?.results ?? []);
      setLastFetch(new Date());
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sendCurrency, recvCurrency, amount]);

  useEffect(() => {
    fetchRates();
    // Auto-refresh every 60 seconds while screen is open
    const interval = setInterval(() => {
      fetchRates();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRates();
  };

  const handleSwap = () => {
    setSendCurrency(recvCurrency);
    setRecvCurrency(sendCurrency);
    fetchRates(recvCurrency, sendCurrency, amount);
  };

  const handleCurrencySelect = (code: string, type: 'send' | 'recv') => {
    if (type === 'send') {
      setSendCurrency(code);
      setShowSendPicker(false);
      fetchRates(code, recvCurrency, amount);
    } else {
      setRecvCurrency(code);
      setShowRecvPicker(false);
      fetchRates(sendCurrency, code, amount);
    }
  };

  const openLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {}
  };

  /** Try app deep link first; fall back to official website if app not installed */
  const openCompany = async (appDeepLink?: string, officialWebsite?: string) => {
    if (appDeepLink) {
      try {
        const canOpen = await Linking.canOpenURL(appDeepLink);
        if (canOpen) {
          await Linking.openURL(appDeepLink);
          return;
        }
      } catch {}
    }
    // App not installed or no deep link → open website
    if (officialWebsite) {
      try { await Linking.openURL(officialWebsite); } catch {}
    }
  };

  const sendAmt = parseFloat(amount) || 0;
  const sendInfo = getCurrencyInfo(sendCurrency);
  const recvInfo = getCurrencyInfo(recvCurrency);

  // Currency Picker Sheet
  const CurrencyPicker = ({ type }: { type: 'send' | 'recv' }) => (
    <View style={styles.pickerOverlay}>
      <TouchableOpacity style={styles.pickerBackdrop} onPress={() => { setShowSendPicker(false); setShowRecvPicker(false); }} />
      <View style={styles.pickerSheet}>
        <Text style={styles.pickerTitle}>{type === 'send' ? t('sendCurrency') : t('receiveCurrency')}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {UNIQUE_CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[
                styles.pickerItem,
                (type === 'send' ? sendCurrency : recvCurrency) === c.code && styles.pickerItemActive,
              ]}
              onPress={() => handleCurrencySelect(c.code, type)}
            >
              <Text style={styles.pickerFlag}>{c.flag}</Text>
              <View style={styles.pickerInfo}>
                <Text style={styles.pickerCode}>{c.code}</Text>
                <Text style={styles.pickerName}>{c.name}</Text>
              </View>
              {(type === 'send' ? sendCurrency : recvCurrency) === c.code && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('rateInquiry')}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Calculator Card ── */}
        <View style={styles.calcCard}>
          <Text style={styles.calcTitle}>{t('compareRates')}</Text>

          {/* Amount Input */}
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t('sendAmount')}</Text>
            <View style={styles.amountInputBox}>
              <Text style={styles.currencySymbol}>{sendInfo.flag}</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="100000"
                placeholderTextColor={Colors.textLight}
                onEndEditing={() => fetchRates()}
                returnKeyType="search"
              />
            </View>
          </View>

          {/* Currency Selectors */}
          <View style={styles.currencyRow}>
            {/* Send */}
            <TouchableOpacity style={styles.currencyBtn} onPress={() => { setShowSendPicker(true); setShowRecvPicker(false); }}>
              <Text style={styles.currencyFlag}>{sendInfo.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.currencyCode}>{sendCurrency}</Text>
                <Text style={styles.currencyName} numberOfLines={1}>{sendInfo.name}</Text>
              </View>
            </TouchableOpacity>

            {/* Swap */}
            <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
              <Ionicons name="swap-horizontal" size={20} color={Colors.primary} />
            </TouchableOpacity>

            {/* Receive */}
            <TouchableOpacity style={styles.currencyBtn} onPress={() => { setShowRecvPicker(true); setShowSendPicker(false); }}>
              <Text style={styles.currencyFlag}>{recvInfo.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.currencyCode}>{recvCurrency}</Text>
                <Text style={styles.currencyName} numberOfLines={1}>{recvInfo.name}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search button */}
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => fetchRates()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>{t('compareRates')}</Text>
              </>
            )}
          </TouchableOpacity>

          {lastFetch && (
            <Text style={styles.lastUpdated}>
              {t('rateLastUpdated')}: {timeAgo(lastFetch.toISOString())}
            </Text>
          )}
        </View>

        {/* ── Results ── */}
        <View style={styles.resultsSection}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💱</Text>
              <Text style={styles.emptyTitle}>{t('noRatesAvailable')}</Text>
              <Text style={styles.emptyText}>{t('tryDifferentPair')}</Text>
            </View>
          ) : (
            <>
              {/* Best Rate Banner */}
              {results[0] && (
                <View style={styles.bestBanner}>
                  <View style={styles.bestBannerLeft}>
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>⭐ {t('bestDeal')}</Text>
                    </View>
                    <Text style={styles.bestProviderName}>{results[0].provider.companyName}</Text>
                    <Text style={styles.bestRateText}>
                      1 {sendCurrency} = <Text style={styles.bestRateValue}>{results[0].rate.toFixed(4)}</Text> {recvCurrency}
                    </Text>
                    {sendAmt > 0 && (
                      <Text style={styles.bestReceiveText}>
                        {t('youReceive')}: <Text style={styles.bestReceiveValue}>
                          {formatAmount(sendAmt * results[0].rate - (results[0].transferFee || 0), recvCurrency)} {recvCurrency}
                        </Text>
                      </Text>
                    )}
                  </View>
                  <View style={styles.bestBannerRight}>
                    {results[0].provider.logoUrl ? (
                      <Image source={{ uri: results[0].provider.logoUrl }} style={styles.bestLogo} resizeMode="contain" />
                    ) : (
                      <View style={styles.bestLogoPlaceholder}>
                        <Text style={styles.bestLogoText}>{results[0].provider.companyName[0]}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Provider Cards */}
              <Text style={styles.allProvidersLabel}>{t('providerList')}</Text>
              {results.map((r: any, i: number) => (
                <View key={r.id} style={[styles.providerCard, i === 0 && styles.providerCardBest]}>
                  <View style={styles.providerHeader}>
                    {/* Logo */}
                    {r.provider.logoUrl ? (
                      <Image source={{ uri: r.provider.logoUrl }} style={styles.providerLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.providerLogoPlaceholder, { backgroundColor: Colors.primary + '15' }]}>
                        <Text style={[styles.providerLogoText, { color: Colors.primary }]}>
                          {r.provider.companyName[0]}
                        </Text>
                      </View>
                    )}

                    {/* Name + badges */}
                    <View style={styles.providerInfo}>
                      <View style={styles.providerNameRow}>
                        <Text style={styles.providerName}>{r.provider.companyName}</Text>
                        {r.provider.isVerified && (
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginLeft: 4 }} />
                        )}
                        {i === 0 && (
                          <View style={styles.bestChip}>
                            <Text style={styles.bestChipText}>Best</Text>
                          </View>
                        )}
                      </View>
                      {r.provider.transferTime && (
                        <Text style={styles.providerTransferTime}>
                          <Ionicons name="time-outline" size={12} color={Colors.textLight} /> {r.provider.transferTime}
                        </Text>
                      )}
                    </View>

                    {/* Rate */}
                    <View style={styles.providerRateBox}>
                      <Text style={styles.providerRate}>{r.rate.toFixed(4)}</Text>
                      <Text style={styles.providerRatePair}>{sendCurrency}→{recvCurrency}</Text>
                    </View>
                  </View>

                  {/* Details row */}
                  {sendAmt > 0 && (
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('transferFee')}</Text>
                        <Text style={styles.detailValue}>
                          {r.transferFee > 0 ? `${r.transferFee.toLocaleString()} ${sendCurrency}` : 'Free'}
                        </Text>
                      </View>
                      <View style={styles.detailDivider} />
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('youReceive')}</Text>
                        <Text style={[styles.detailValue, styles.receiveValue]}>
                          {formatAmount(sendAmt * r.rate - (r.transferFee || 0), recvCurrency)} {recvCurrency}
                        </Text>
                      </View>
                    </View>
                  )}

                  {r.isStale && (
                    <View style={styles.staleWarning}>
                      <Ionicons name="warning-outline" size={12} color="#F59E0B" />
                      <Text style={styles.staleText}>{t('staleRate')}</Text>
                    </View>
                  )}

                  {/* CTA — opens app if installed, otherwise website */}
                  <View style={styles.ctaRow}>
                    {(r.provider.appDeepLink || r.provider.officialWebsite) ? (
                      <TouchableOpacity
                        style={r.provider.appDeepLink ? styles.ctaAppBtn : styles.ctaWebBtn}
                        onPress={() => openCompany(r.provider.appDeepLink, r.provider.officialWebsite)}
                      >
                        <Ionicons
                          name={r.provider.appDeepLink ? 'phone-portrait-outline' : 'globe-outline'}
                          size={14}
                          color={r.provider.appDeepLink ? '#fff' : Colors.primary}
                        />
                        <Text style={r.provider.appDeepLink ? styles.ctaAppText : styles.ctaWebText}>
                          {r.provider.appDeepLink ? t('openApp') : t('openWebsite')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.noLinkText}>Contact provider directly</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.textLight} />
          <Text style={styles.disclaimerText}>
            Rates shown are for reference only. Actual rates may vary at time of transfer. AM Mart is not a financial service provider.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Currency Pickers */}
      {showSendPicker && <CurrencyPicker type="send" />}
      {showRecvPicker && <CurrencyPicker type="recv" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 4, borderRadius: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.text },

  // Calculator Card
  calcCard: {
    margin: Spacing.md, backgroundColor: '#fff', borderRadius: 16,
    padding: Spacing.md, ...Shadow.sm,
  },
  calcTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },

  amountRow: { marginBottom: 12 },
  amountLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '600', marginBottom: 6 },
  amountInputBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  currencySymbol: { fontSize: 20, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.text },

  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  currencyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  currencyFlag: { fontSize: 24 },
  currencyCode: { fontSize: 15, fontWeight: '700', color: Colors.text },
  currencyName: { fontSize: 11, color: Colors.textLight, maxWidth: 80 },
  swapBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },

  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  lastUpdated: { textAlign: 'center', fontSize: 11, color: Colors.textLight, marginTop: 8 },

  // Results
  resultsSection: { paddingHorizontal: Spacing.md },

  loadingBox: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, color: Colors.textLight, fontSize: 14 },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },

  // Best Banner
  bestBanner: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 16,
    padding: Spacing.md, marginBottom: 16,
  },
  bestBannerLeft: { flex: 1 },
  bestBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8,
  },
  bestBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bestProviderName: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 4 },
  bestRateText: { color: '#fff', fontSize: 14, marginBottom: 2 },
  bestRateValue: { fontSize: 20, fontWeight: '800' },
  bestReceiveText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  bestReceiveValue: { color: '#fff', fontWeight: '700' },
  bestBannerRight: { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  bestLogo: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fff' },
  bestLogoPlaceholder: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  bestLogoText: { color: '#fff', fontSize: 22, fontWeight: '800' },

  allProvidersLabel: {
    fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10,
  },

  // Provider Card
  providerCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: Spacing.md,
    marginBottom: 10, ...Shadow.sm, borderWidth: 1, borderColor: '#F0F0F0',
  },
  providerCardBest: { borderColor: Colors.primary + '30', borderWidth: 1.5 },
  providerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  providerLogo: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#F8F9FA',
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  providerLogoPlaceholder: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  providerLogoText: { fontSize: 18, fontWeight: '800' },
  providerInfo: { flex: 1 },
  providerNameRow: { flexDirection: 'row', alignItems: 'center' },
  providerName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  bestChip: {
    backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 6,
    paddingVertical: 2, marginLeft: 6,
  },
  bestChipText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  providerTransferTime: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  providerRateBox: { alignItems: 'flex-end' },
  providerRate: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  providerRatePair: { fontSize: 10, color: Colors.textLight },

  // Details
  detailsRow: {
    flexDirection: 'row', marginTop: 12, backgroundColor: '#F8F9FA',
    borderRadius: 10, padding: 10,
  },
  detailItem: { flex: 1, alignItems: 'center' },
  detailDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 2 },
  detailLabel: { fontSize: 10, color: Colors.textLight, marginBottom: 3 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  receiveValue: { color: Colors.primary },

  // Stale warning
  staleWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 8, backgroundColor: '#FFFBEB', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  staleText: { fontSize: 11, color: '#B45309' },

  // CTA buttons
  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ctaWebBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10,
    paddingVertical: 9,
  },
  ctaWebText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  ctaAppBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 9,
  },
  ctaAppText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  noLinkText: { flex: 1, textAlign: 'center', fontSize: 12, color: Colors.textLight },

  // Currency Picker
  pickerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '60%', padding: Spacing.md,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12, textAlign: 'center' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4, borderRadius: 10,
  },
  pickerItemActive: { backgroundColor: Colors.primary + '10' },
  pickerFlag: { fontSize: 26 },
  pickerInfo: { flex: 1 },
  pickerCode: { fontSize: 15, fontWeight: '700', color: Colors.text },
  pickerName: { fontSize: 12, color: Colors.textLight },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', gap: 6, marginHorizontal: Spacing.md,
    backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.textLight, lineHeight: 16 },
});
