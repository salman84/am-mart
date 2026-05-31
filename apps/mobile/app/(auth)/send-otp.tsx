import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

function formatKoreanPhone(phone: string) {
  if (phone.length === 11 && phone.startsWith('010')) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

type Status = 'sending' | 'success' | 'error';

export default function SendOtpScreen() {
  const { phone, returnTo } = useLocalSearchParams<{ phone: string; returnTo?: string }>();
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>('sending');
  const [errorMsg, setErrorMsg] = useState('');

  const sendOtp = async () => {
    if (!phone) {
      setErrorMsg(t('phoneMissing'));
      setStatus('error');
      return;
    }
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await authApi.sendOtp(phone);
      const userId = res.data?.userId as string;
      const devCode: string = res.data?.devCode || '';
      if (!userId) throw new Error('Server did not return a user ID');
      setStatus('success');
      setTimeout(() => {
        router.replace({
          pathname: '/(auth)/verify-otp' as any,
          params: { phone, userId, mode: 'login', returnTo: returnTo || '', devCode },
        });
      }, 600);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t('noAccountFound');
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  useEffect(() => {
    sendOtp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {status === 'sending' && (
          <>
            <View style={styles.iconCircle}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
            <Text style={styles.title}>{t('sendingOtp')}</Text>
            <Text style={styles.subtitle}>
              {t('sendingCodeTo')}{'\n'}
              <Text style={styles.phoneHighlight}>{formatKoreanPhone(phone || '')}</Text>
            </Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={[styles.iconCircle, styles.iconSuccess]}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{t('codeSentTitle')}</Text>
            <Text style={styles.subtitle}>{t('redirectingVerify')}</Text>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={[styles.iconCircle, styles.iconError]}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            </View>
            <Text style={styles.title}>{t('sendFailed')}</Text>
            <Text style={styles.subtitle}>{errorMsg}</Text>

            <TouchableOpacity style={styles.retryBtn} onPress={sendOtp}>
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>{t('back')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  back: {
    marginTop: Spacing.base, marginLeft: Spacing.lg,
    width: 40, height: 40, justifyContent: 'center',
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: 60,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconSuccess: { backgroundColor: Colors.primaryLight },
  iconError: { backgroundColor: '#FEE2E2' },
  title: {
    fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold,
    color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 24,
  },
  phoneHighlight: { color: Colors.primary, fontWeight: FontWeight.bold },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: Spacing.xl, backgroundColor: Colors.primary,
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: BorderRadius['2xl'],
  },
  retryText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  backBtn: { marginTop: Spacing.base, padding: 12 },
  backBtnText: { color: Colors.textSecondary, fontSize: FontSize.base },
});
