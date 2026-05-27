import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { topupApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import { useLanguage } from '../../../src/i18n';
import Toast from 'react-native-toast-message';

export default function TopupConfirmScreen() {
  const { t } = useLanguage();
  const p = useLocalSearchParams<{
    type: string; countryCode: string; countryName: string; countryFlag: string;
    operator: string; phone: string; amount: string; currency: string;
    krwRate: string; totalKRW: string;
  }>();

  const [paymentMethod, setPaymentMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [isLoading, setIsLoading] = useState(false);

  const amount = Number(p.amount);
  const krwRate = Number(p.krwRate) || 1;
  const baseKRW = Number(p.totalKRW);
  const serviceFee = Math.round(baseKRW * 0.03);
  const grandTotal = baseKRW + serviceFee;
  const isLocal = p.type === 'local' || p.currency === 'KRW';

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await topupApi.createOrder({
        recipientPhone: p.phone,
        countryCode: p.countryCode,
        countryName: p.countryName,
        operator: p.operator,
        amount,
        currency: p.currency,
        paymentMethod,
        totalKRW: grandTotal,
      });
      Toast.show({
        type: 'success',
        text1: t('topupSuccess'),
        text2: `${amount.toLocaleString()} ${p.currency} → ${p.phone}`,
      });
      router.replace('/(customer)');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Top-up failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('confirmTopUp')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top summary */}
        <View style={styles.summaryCard}>
          <View style={styles.topRow}>
            <Text style={styles.flag}>{p.countryFlag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.countryName}>{p.countryName}</Text>
              <Text style={styles.operatorText}>{p.operator}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.phoneRow}>
            <Ionicons name="phone-portrait-outline" size={20} color={Colors.topup} />
            <Text style={styles.phone}>{p.phone}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>{t('selectAmount')}</Text>
            <Text style={styles.amountValue}>
              {isLocal ? `₩${amount.toLocaleString()}` : `${amount.toLocaleString()} ${p.currency}`}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('paymentMethod')}</Text>
          {[
            { id: 'WALLET', label: t('wallet'), icon: 'wallet-outline' },
            { id: 'CARD', label: t('creditCard'), icon: 'card-outline' },
          ].map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.methodCard, paymentMethod === m.id && styles.methodSelected]}
              onPress={() => setPaymentMethod(m.id as 'WALLET' | 'CARD')}
            >
              <Ionicons name={m.icon as any} size={22} color={paymentMethod === m.id ? Colors.topup : Colors.textSecondary} />
              <Text style={[styles.methodLabel, paymentMethod === m.id && { color: Colors.topup }]}>{m.label}</Text>
              {paymentMethod === m.id && <Ionicons name="checkmark-circle" size={20} color={Colors.topup} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('priceBreakdown')}</Text>
          {!isLocal && (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('amountIn').replace('{currency}', p.currency)}</Text>
                <Text style={styles.priceValue}>{amount.toLocaleString()} {p.currency}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('exchangeRate')}</Text>
                <Text style={styles.priceValue}>1 {p.currency} ≈ ₩{Math.round(krwRate).toLocaleString()}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t('amountKRWLabel')}</Text>
                <Text style={styles.priceValue}>₩{baseKRW.toLocaleString()}</Text>
              </View>
            </>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('serviceFee')} (3%)</Text>
            <Text style={styles.priceValue}>₩{serviceFee.toLocaleString()}</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('totalCharge')}</Text>
            <Text style={styles.totalValue}>₩{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
          <Text style={styles.noticeText}>{t('processingNote')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, isLoading && styles.disabled]}
          onPress={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.confirmText}>{t('payNow').replace('{amount}', grandTotal.toLocaleString())}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, ...Shadow.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.base },
  flag: { fontSize: 44 },
  countryName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  operatorText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginBottom: Spacing.base },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.base },
  phone: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  amountBox: {
    alignItems: 'center', paddingVertical: Spacing.base,
    backgroundColor: Colors.topupLight, borderRadius: BorderRadius.lg,
  },
  amountLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  amountValue: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.topup, marginTop: 4 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.sm,
    borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 8,
  },
  methodSelected: { borderColor: Colors.topup, backgroundColor: Colors.topupLight },
  methodLabel: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priceValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.topup },
  notice: {
    flexDirection: 'row', gap: 8, backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.lg, padding: Spacing.base,
  },
  noticeText: { flex: 1, fontSize: FontSize.sm, color: Colors.info, lineHeight: 20 },
  confirmBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: Colors.topup, height: 56, borderRadius: BorderRadius['2xl'], ...Shadow.md,
  },
  disabled: { opacity: 0.6 },
  confirmText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
