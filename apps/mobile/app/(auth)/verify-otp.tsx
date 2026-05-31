import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { authApi } from '../../src/services/api';
import { setUser, loginWithOtp } from '../../src/store/slices/authSlice';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { AppDispatch } from '../../src/store';
import { useLanguage } from '../../src/i18n';

function formatKoreanPhone(phone: string) {
  // 01012345678 → 010-1234-5678
  if (phone.length === 11 && phone.startsWith('010')) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  }
  return phone;
}

export default function VerifyOtpScreen() {
  const { userId, phone, returnTo, mode, devCode } = useLocalSearchParams<{
    userId?: string; phone: string; returnTo?: string; mode?: string; devCode?: string;
  }>();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useLanguage();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Only auto-fill in development builds when backend returns a devCode
    if (__DEV__ && devCode && devCode.length === 6) {
      const digits = devCode.split('');
      setOtp(digits);
    } else {
      inputRefs.current[0]?.focus();
    }
  }, [devCode]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    // Handle paste — fill all boxes
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const next = Array(6).fill('').map((_, i) => digits[i] || '');
      setOtp(next);
      const lastFilled = Math.min(digits.length - 1, 5);
      inputRefs.current[lastFilled]?.focus();
      if (digits.length === 6) handleVerify(digits);
      return;
    }
    const digit = value.replace(/\D/g, '');
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (!digit && index > 0) inputRefs.current[index - 1]?.focus();
    if (next.every((d) => d) && next.join('').length === 6) handleVerify(next.join(''));
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      Toast.show({ type: 'error', text1: t('enter6Digits') });
      return;
    }
    setIsLoading(true);
    try {
      if (mode === 'login') {
        // OTP login — loginWithOtp thunk
        if (!userId) {
          Toast.show({ type: 'error', text1: t('missingSession') });
          return;
        }
        const result = await dispatch(loginWithOtp({ userId, otp: code }));
        if (loginWithOtp.fulfilled.match(result)) {
          const role = result.payload.role;
          if (role === 'RIDER') router.replace('/(rider)');
          else if (role === 'SELLER') router.replace('/(seller)');
          else if (returnTo === 'cart') router.replace('/(customer)/cart');
          else router.replace('/(customer)');
        } else {
          throw new Error(result.payload as string || t('invalidOtp'));
        }
      } else {
        // Registration OTP verify
        const res = await authApi.verifyPhone({ userId, otp: code });
        await SecureStore.setItemAsync('accessToken', res.data.accessToken);
        await SecureStore.setItemAsync('refreshToken', res.data.refreshToken);
        dispatch(setUser(res.data.user));
        if (returnTo === 'cart') router.replace('/(customer)/cart');
        else router.replace('/(customer)');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.message || e.response?.data?.message || t('invalidOtp') });
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      const res = await authApi.sendOtp(phone);
      setResendTimer(60);
      const newDevCode: string | undefined = res?.data?.devCode;
      if (__DEV__ && newDevCode && newDevCode.length === 6) {
        setOtp(newDevCode.split(''));
        Toast.show({ type: 'info', text1: 'DEV: SMS unavailable', text2: `Code: ${newDevCode}` });
      } else {
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        Toast.show({ type: 'success', text1: t('otpResent'), text2: t('newCodeSentTo').replace('{phone}', formatKoreanPhone(phone)) });
      }
    } catch {
      Toast.show({ type: 'error', text1: t('failedResend') });
    }
  };

  const otpComplete = otp.every((d) => d);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses" size={36} color={Colors.primary} />
          </View>

          <Text style={styles.title}>{t('enterOtp')}</Text>
          <Text style={styles.subtitle}>
            {t('weSent6Digit')}{'\n'}
            <Text style={styles.phoneHighlight}>{formatKoreanPhone(phone)}</Text>
          </Text>

          {/* 6-box OTP input */}
          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>{t('didntReceive')}</Text>
            <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
              <Text style={[styles.resendLink, resendTimer > 0 && styles.resendDisabled]}>
                {resendTimer > 0 ? t('resendIn').replace('{seconds}', String(resendTimer)) : t('resend')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, (!otpComplete || isLoading) && styles.disabled]}
            onPress={() => handleVerify()}
            disabled={!otpComplete || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>{t('verifyAndContinue')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Dev helper — shows when SMS gateway is not configured */}
          {devCode ? (
            <View style={styles.devNote}>
              <Ionicons name="code-slash-outline" size={14} color="#92400E" />
              <Text style={styles.devText}>SMS not sent — code auto-filled: <Text style={{ fontWeight: '700' }}>{devCode}</Text></Text>
            </View>
          ) : __DEV__ ? (
            <View style={styles.devNote}>
              <Ionicons name="code-slash-outline" size={14} color="#92400E" />
              <Text style={styles.devText}>DEV: Check backend console for OTP</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  back: { marginTop: Spacing.base, marginLeft: Spacing.lg, width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.lg, alignItems: 'center', paddingTop: Spacing.lg },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight, justifyContent: 'center',
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  title: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing['2xl'] },
  phoneHighlight: { color: Colors.primary, fontWeight: FontWeight.bold },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl },
  otpBox: {
    width: 46, height: 56, borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.surface, textAlign: 'center',
    fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text,
    ...Shadow.sm,
  },
  otpBoxFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  resendLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  resendLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  resendDisabled: { color: Colors.textLight },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    width: '100%', height: 54, backgroundColor: Colors.primary,
    borderRadius: BorderRadius['2xl'], ...Shadow.md,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  devNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.xl, padding: Spacing.sm,
    backgroundColor: '#FEF3C7', borderRadius: BorderRadius.md,
  },
  devText: { color: '#92400E', fontSize: FontSize.xs },
});
