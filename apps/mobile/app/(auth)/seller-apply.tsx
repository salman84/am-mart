import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, sellerApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

export default function SellerApplyScreen() {
  const [fullName, setFullName] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const part1Ref = useRef<TextInput>(null);
  const part2Ref = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const storeNameRef = useRef<TextInput>(null);

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

  const canSubmit =
    fullName.trim() &&
    phoneComplete &&
    password.length >= 8 &&
    password === confirmPassword &&
    storeName.trim();

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Full name is required' }); return;
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
    if (!storeName.trim()) {
      Toast.show({ type: 'error', text1: 'Store name is required' }); return;
    }

    setIsLoading(true);
    try {
      // 1. Register the user account with SELLER role
      const regRes = await authApi.register({
        fullName: fullName.trim(),
        phone: fullPhone,
        email: email.trim() || undefined,
        password,
        role: 'SELLER',
      });

      // 2. Submit the seller application using the returned token if available,
      //    otherwise the interceptor will pick up the token from SecureStore after verify-otp.
      //    We store the store details in params and apply after OTP verification.
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          userId: regRes.data.userId,
          phone: fullPhone,
          storeName: storeName.trim(),
          storeDescription: storeDescription.trim(),
          isSeller: 'true',
          returnTo: '',
        },
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successBody}>
            Your seller application is under review. Our team will approve your store within 1-3 business days.
            You will be notified once approved.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.sellerBadge}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
              <Text style={styles.sellerBadgeText}>Seller Application</Text>
            </View>
            <Text style={styles.title}>Open Your Store</Text>
            <Text style={styles.subtitle}>Register as a seller and start earning on AM Mart</Text>
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

            {/* Phone */}
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
            </View>

            {/* Email */}
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
                  returnKeyType="next"
                  onSubmitEditing={() => storeNameRef.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Store Details</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Store Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Store Name <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="storefront-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={storeNameRef}
                  style={styles.input}
                  placeholder="e.g. Fresh Farm Store"
                  placeholderTextColor={Colors.textLight}
                  value={storeName}
                  onChangeText={setStoreName}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Store Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Store Description <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput
                style={[styles.inputRow, styles.textArea]}
                placeholder="Tell us about your store and what you sell..."
                placeholderTextColor={Colors.textLight}
                value={storeDescription}
                onChangeText={setStoreDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (!canSubmit || isLoading) && styles.disabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Submit Application</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
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
  header: { paddingVertical: Spacing.xl, gap: 8 },
  sellerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  sellerBadgeText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  title: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold, color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
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
  textArea: {
    height: 100, textAlignVertical: 'top', paddingTop: 12,
    fontSize: FontSize.base, color: Colors.text,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
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
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 16 },
  successIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  successTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.text, textAlign: 'center' },
  successBody: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base, borderRadius: BorderRadius['2xl'], marginTop: Spacing.sm,
  },
  backBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
