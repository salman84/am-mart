import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../src/store/slices/authSlice';
import { AppDispatch, RootState } from '../../src/store';
import { isPinEnabled } from '../../src/utils/pinSecurity';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';
import { useBranding } from '../../src/context/BrandingContext';

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { t } = useLanguage();
  const { appName, appLogo } = useBranding();
  // Keep legacy local alias for JSX below
  const brand = { name: appName, logo: appLogo };

  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const part1Ref = useRef<TextInput>(null);
  const part2Ref = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handlePart1Change = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPhonePart1(digits);
    if (digits.length === 4) part2Ref.current?.focus();
  };

  const handlePart2Change = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPhonePart2(digits);
    if (digits.length === 4) passwordRef.current?.focus();
  };

  const handlePart2KeyPress = (key: string) => {
    if (key === 'Backspace' && phonePart2 === '') part1Ref.current?.focus();
  };

  const fullPhone = `010${phonePart1}${phonePart2}`;
  const phoneComplete = phonePart1.length === 4 && phonePart2.length === 4;
  const canLogin = loginMode === 'phone'
    ? (phoneComplete && password.length >= 1)
    : (email.includes('@') && password.length >= 1);

  const handleLogin = async () => {
    if (!canLogin) {
      if (loginMode === 'phone') {
        Toast.show({ type: 'error', text1: t('enterPhoneAndPassword' as any) || 'Enter phone number and password' });
      } else {
        Toast.show({ type: 'error', text1: t('enterEmailAndPassword' as any) || 'Enter email and password' });
      }
      return;
    }
    const identifier = loginMode === 'phone' ? fullPhone : email;
    const result = await dispatch(login({ identifier, password }));
    if (login.fulfilled.match(result)) {
      const role = result.payload.role;
      if (role === 'RIDER') { router.replace('/(rider)'); return; }
      if (role === 'SELLER') { router.replace('/(seller)'); return; }
      // Customer / Admin: check if PIN is already set
      const pinSet = await isPinEnabled();
      if (!pinSet) {
        // First login → offer PIN setup
        router.replace('/(auth)/pin-setup');
      } else if (returnTo === 'cart') {
        router.replace('/(customer)/cart');
      } else {
        router.replace('/(customer)');
      }
    } else {
      const errMsg = loginMode === 'phone'
        ? (t('incorrectLogin' as any) || 'Incorrect phone or password')
        : (t('incorrectEmailLogin' as any) || 'Incorrect email or password');
      Toast.show({ type: 'error', text1: result.payload as string || errMsg });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            {brand.logo ? (
              <Image source={{ uri: brand.logo }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <View style={styles.logoBox}>
                <Text style={styles.logoText}>{brand.name.slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.title}>{t('loginTitle' as any) || 'Welcome Back!'}</Text>
            <Text style={styles.subtitle}>{t('loginSubtitle' as any) || `Sign in to continue shopping at ${brand.name}`}</Text>
          </View>

          <View style={styles.form}>
            {/* Login Mode Toggle */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, loginMode === 'phone' && styles.toggleBtnActive]}
                onPress={() => setLoginMode('phone')}
              >
                <Text style={[styles.toggleText, loginMode === 'phone' && styles.toggleTextActive]}>
                  {t('phoneTab' as any)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, loginMode === 'email' && styles.toggleBtnActive]}
                onPress={() => setLoginMode('email')}
              >
                <Text style={[styles.toggleText, loginMode === 'email' && styles.toggleTextActive]}>
                  {t('emailTab' as any)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Korean Phone */}
            {loginMode === 'phone' && (
              <View style={styles.field}>
                <Text style={styles.label}>{t('mobileNumber' as any) || 'Mobile Number'}</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>010</Text>
                  </View>
                  <Text style={styles.dash}>-</Text>
                  <TextInput
                    ref={part1Ref}
                    style={[styles.phoneBox, phonePart1.length === 4 && styles.phoneBoxDone]}
                    placeholder="0000"
                    placeholderTextColor={Colors.textLight}
                    value={phonePart1}
                    onChangeText={handlePart1Change}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                    autoFocus
                  />
                  <Text style={styles.dash}>-</Text>
                  <TextInput
                    ref={part2Ref}
                    style={[styles.phoneBox, phonePart2.length === 4 && styles.phoneBoxDone]}
                    placeholder="0000"
                    placeholderTextColor={Colors.textLight}
                    value={phonePart2}
                    onChangeText={handlePart2Change}
                    onKeyPress={({ nativeEvent }) => handlePart2KeyPress(nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />
                </View>
              </View>
            )}

            {/* Email */}
            {loginMode === 'email' && (
              <View style={styles.field}>
                <Text style={styles.label}>{t('emailAddress' as any) || 'Email Address'}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@email.com"
                    placeholderTextColor={Colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>
            )}

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>{t('password' as any) || 'Password'}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder={t('enterPassword' as any) || 'Enter your password'}
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={canLogin ? handleLogin : undefined}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.forgot} onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>{t('forgotPassword' as any) || 'Forgot Password?'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, (!canLogin || isLoading) && styles.disabled]}
              onPress={handleLogin}
              disabled={!canLogin || isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('signInBtn' as any) || 'Sign In'}</Text>}
            </TouchableOpacity>

            {/* OTP Login — phone mode only */}
            {loginMode === 'phone' && (
              <TouchableOpacity
                style={styles.otpBtn}
                onPress={() => {
                  const phone = `010${phonePart1}${phonePart2}`;
                  if (phonePart1.length < 4 || phonePart2.length < 4) {
                    Toast.show({ type: 'info', text1: t('enterPhoneFirst' as any) });
                    return;
                  }
                  router.push({
                    pathname: '/(auth)/send-otp' as any,
                    params: { phone, returnTo: returnTo || '' },
                  });
                }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                <Text style={styles.otpBtnText}>{t('loginWithOtp' as any)}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('newUser' as any).replace('{name}', brand.name)} </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/register', params: { returnTo } })}>
              <Text style={styles.footerLink}>{t('createAccountLink' as any) || 'Create Account'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  back: { marginTop: Spacing.base, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  logoBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary, justifyContent: 'center',
    alignItems: 'center', marginBottom: Spacing.base,
  },
  logoImage: { width: 64, height: 64, borderRadius: 32, marginBottom: Spacing.base },
  logoText: { fontSize: 26, fontWeight: FontWeight.extrabold, color: '#fff' },
  title: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  /* Toggle */
  toggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  toggleTextActive: { color: '#183522' },
  /* Phone */
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phonePrefix: {
    height: 54, paddingHorizontal: 16, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceVariant, borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  phonePrefixText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  dash: { fontSize: FontSize.xl, color: Colors.textSecondary, fontWeight: FontWeight.bold },
  phoneBox: {
    flex: 1, height: 54, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface, fontSize: FontSize.xl,
    fontWeight: FontWeight.bold, color: Colors.text, ...Shadow.sm,
  },
  phoneBoxDone: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, height: 54, ...Shadow.sm,
  },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.text },
  eyeBtn: { position: 'absolute', right: Spacing.base, padding: 4 },
  forgot: { alignSelf: 'flex-end', marginTop: 4 },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  button: {
    backgroundColor: Colors.primary, height: 54,
    borderRadius: BorderRadius['2xl'], justifyContent: 'center',
    alignItems: 'center', marginTop: 8, ...Shadow.md,
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.base },
  footerLink: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  otpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  otpBtnText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
});
