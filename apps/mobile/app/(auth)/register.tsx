import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, appSettingsApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [brand, setBrand] = useState({ name: 'AM Mart', logo: '' });

  useEffect(() => {
    appSettingsApi.getPublic()
      .then((r) => {
        const d = r.data;
        if (d) setBrand({ name: d.APP_NAME || 'AM Mart', logo: d.APP_LOGO || '' });
      })
      .catch(() => {});
  }, []);

  const [fullName, setFullName] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const part1Ref = useRef<TextInput>(null);
  const part2Ref = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handlePart1Change = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPhonePart1(digits);
    if (digits.length === 4) part2Ref.current?.focus();
  };

  const handlePart2Change = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPhonePart2(digits);
    if (digits.length === 4) emailRef.current?.focus();
  };

  const handlePart2KeyPress = (key: string) => {
    if (key === 'Backspace' && phonePart2 === '') part1Ref.current?.focus();
  };

  const fullPhone = `010${phonePart1}${phonePart2}`;
  const phoneComplete = phonePart1.length === 4 && phonePart2.length === 4;

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your full name' }); return;
    }
    if (!phoneComplete) {
      Toast.show({ type: 'error', text1: 'Enter complete phone number (010-XXXX-XXXX)' }); return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' }); return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' }); return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        phone: fullPhone,
        email: email.trim() || undefined,
        password,
      });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { userId: res.data.userId, phone: fullPhone, returnTo: returnTo || '' },
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = fullName.trim() && phoneComplete && password.length >= 8 && password === confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Register with {brand.name} using your Korean mobile number</Text>
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Full Name <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.textLight}
                  value={fullName}
                  onChangeText={setFullName}
                  returnKeyType="next"
                  onSubmitEditing={() => part1Ref.current?.focus()}
                />
              </View>
            </View>

            {/* Korean Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Mobile Number <Text style={styles.req}>*</Text>
                <Text style={styles.note}> · Korean number only</Text>
              </Text>
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
              <Text style={styles.hint}>OTP will be sent to this number to verify your account</Text>
            </View>

            {/* Email — Optional */}
            <View style={styles.field}>
              <Text style={styles.label}>Email <Text style={styles.optional}>(Optional)</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="your@email.com"
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

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder="Min 8 characters"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password <Text style={styles.req}>*</Text></Text>
              <View style={[styles.inputRow, !!confirmPassword && password !== confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={Colors.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={canSubmit ? handleRegister : undefined}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>

            <View style={styles.terms}>
              <Text style={styles.termsText}>By registering you agree to our </Text>
              <TouchableOpacity><Text style={styles.termsLink}>Terms & Privacy Policy</Text></TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, (!canSubmit || isLoading) && styles.disabled]}
              onPress={handleRegister}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have a {brand.name} account? </Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/login', params: { returnTo } })}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sellerLink} onPress={() => router.push('/(auth)/seller-apply')}>
            <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
            <Text style={styles.sellerLinkText}>Register as a Seller</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: 40 },
  back: { marginTop: Spacing.base, width: 40, height: 40, justifyContent: 'center' },
  header: { paddingVertical: Spacing.xl },
  title: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold, color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  req: { color: Colors.danger },
  optional: { color: Colors.textSecondary, fontWeight: FontWeight.regular },
  note: { color: Colors.textSecondary, fontWeight: FontWeight.regular },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, height: 54, ...Shadow.sm,
  },
  inputError: { borderColor: Colors.danger },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.text },
  eyeBtn: { position: 'absolute', right: Spacing.base, padding: 4 },
  errorText: { fontSize: FontSize.xs, color: Colors.danger, marginTop: 2 },
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
  hint: { fontSize: FontSize.xs, color: Colors.textSecondary },
  terms: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  termsText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  termsLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 54,
    borderRadius: BorderRadius['2xl'], marginTop: 4, ...Shadow.md,
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.xl },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.base },
  footerLink: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  sellerLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing.base, paddingVertical: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: BorderRadius['2xl'],
  },
  sellerLinkText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
