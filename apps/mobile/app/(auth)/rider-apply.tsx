import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, riderApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const VEHICLE_TYPES = [
  { key: 'MOTORCYCLE', icon: 'bicycle-outline' as const, labelKey: 'riderVehicleMotorcycle' },
  { key: 'BICYCLE', icon: 'bicycle-outline' as const, labelKey: 'riderVehicleBicycle' },
  { key: 'CAR', icon: 'car-outline' as const, labelKey: 'riderVehicleCar' },
  { key: 'SCOOTER', icon: 'speedometer-outline' as const, labelKey: 'riderVehicleScooter' },
];

export default function RiderApplyScreen() {
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('MOTORCYCLE');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const part1Ref = useRef<TextInput>(null);
  const part2Ref = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const vehicleNumRef = useRef<TextInput>(null);
  const licenseRef = useRef<TextInput>(null);

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
    vehicleNumber.trim() &&
    licenseNumber.trim();

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: t('riderNameRequired') }); return;
    }
    if (!phoneComplete) {
      Toast.show({ type: 'error', text1: t('enterPhoneError') }); return;
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: t('passwordMinLength') }); return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('passwordsNoMatch') }); return;
    }
    if (!vehicleNumber.trim()) {
      Toast.show({ type: 'error', text1: t('riderVehicleNumRequired') }); return;
    }
    if (!licenseNumber.trim()) {
      Toast.show({ type: 'error', text1: t('riderLicenseRequired') }); return;
    }

    setIsLoading(true);
    try {
      // 1. Register the user account with RIDER role
      const regRes = await authApi.register({
        fullName: fullName.trim(),
        phone: fullPhone,
        email: email.trim() || undefined,
        password,
        role: 'RIDER',
      });

      // 2. Navigate to OTP verification — pass rider details to submit after verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          userId: regRes.data.userId,
          phone: fullPhone,
          vehicleType,
          vehicleNumber: vehicleNumber.trim(),
          licenseNumber: licenseNumber.trim(),
          isRider: 'true',
          returnTo: '',
        },
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('registrationFailed') });
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
          <Text style={styles.successTitle}>{t('riderApplicationSubmitted')}</Text>
          <Text style={styles.successBody}>{t('riderApplicationReview')}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backBtnText}>{t('backToLogin')}</Text>
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
            <View style={styles.riderBadge}>
              <Ionicons name="bicycle-outline" size={20} color={Colors.secondary} />
              <Text style={styles.riderBadgeText}>{t('riderApplication')}</Text>
            </View>
            <Text style={styles.title}>{t('riderBecomeTitle')}</Text>
            <Text style={styles.subtitle}>{t('riderBecomeSubtitle')}</Text>
          </View>

          {/* Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={[styles.infoIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="cash-outline" size={20} color="#059669" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t('riderEarnMoney')}</Text>
                <Text style={styles.infoDesc}>{t('riderEarnMoneyDesc')}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={[styles.infoIcon, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="time-outline" size={20} color="#2563EB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t('riderFlexibleHours')}</Text>
                <Text style={styles.infoDesc}>{t('riderFlexibleHoursDesc')}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={[styles.infoIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="navigate-outline" size={20} color="#EA580C" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>{t('riderEasyNavigation')}</Text>
                <Text style={styles.infoDesc}>{t('riderEasyNavigationDesc')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>{t('fullName')} <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('enterFullName')}
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
                {t('mobileNumber')} <Text style={styles.req}>*</Text>
                <Text style={styles.note}> · {t('koreanNumberOnly')}</Text>
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
              <Text style={styles.label}>{t('emailOptional')}</Text>
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
              <Text style={styles.label}>{t('password')} <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder={t('passwordMinLength')}
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
              <Text style={styles.label}>{t('confirmPassword')} <Text style={styles.req}>*</Text></Text>
              <View style={[styles.inputRow, !!confirmPassword && password !== confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={confirmRef}
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder={t('reEnterPassword')}
                  placeholderTextColor={Colors.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  returnKeyType="next"
                  onSubmitEditing={() => vehicleNumRef.current?.focus()}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>{t('passwordsNoMatch')}</Text>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('riderVehicleDetails')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Vehicle Type */}
            <View style={styles.field}>
              <Text style={styles.label}>{t('riderVehicleType')} <Text style={styles.req}>*</Text></Text>
              <View style={styles.vehicleGrid}>
                {VEHICLE_TYPES.map((v) => (
                  <TouchableOpacity
                    key={v.key}
                    style={[styles.vehicleOption, vehicleType === v.key && styles.vehicleSelected]}
                    onPress={() => setVehicleType(v.key)}
                  >
                    <Ionicons
                      name={v.icon}
                      size={22}
                      color={vehicleType === v.key ? Colors.secondary : Colors.textSecondary}
                    />
                    <Text style={[
                      styles.vehicleLabel,
                      vehicleType === v.key && styles.vehicleLabelSelected,
                    ]}>
                      {t(v.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Vehicle Number */}
            <View style={styles.field}>
              <Text style={styles.label}>{t('riderVehicleNumber')} <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="car-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={vehicleNumRef}
                  style={styles.input}
                  placeholder={t('riderVehicleNumPlaceholder')}
                  placeholderTextColor={Colors.textLight}
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  onSubmitEditing={() => licenseRef.current?.focus()}
                />
              </View>
            </View>

            {/* License Number */}
            <View style={styles.field}>
              <Text style={styles.label}>{t('riderLicenseNumber')} <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <Ionicons name="card-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                <TextInput
                  ref={licenseRef}
                  style={styles.input}
                  placeholder={t('riderLicenseNumPlaceholder')}
                  placeholderTextColor={Colors.textLight}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Requirements Note */}
            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>{t('riderRequirementsTitle')}</Text>
              <View style={styles.reqItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.reqText}>{t('riderReq1')}</Text>
              </View>
              <View style={styles.reqItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.reqText}>{t('riderReq2')}</Text>
              </View>
              <View style={styles.reqItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.reqText}>{t('riderReq3')}</Text>
              </View>
              <View style={styles.reqItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text style={styles.reqText}>{t('riderReq4')}</Text>
              </View>
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
                  <Text style={styles.buttonText}>{t('riderSubmitApplication')}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('alreadyHaveAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>{t('signIn')}</Text>
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
  riderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  riderBadgeText: { fontSize: FontSize.sm, color: Colors.secondary, fontWeight: FontWeight.semibold },
  title: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold, color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
  infoCards: { gap: 10, marginBottom: Spacing.lg },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.base, borderWidth: 1, borderColor: Colors.border,
  },
  infoIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  infoDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
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
  phoneBoxDone: { borderColor: Colors.secondary, backgroundColor: '#EFF6FF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleOption: {
    flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14, ...Shadow.sm,
  },
  vehicleSelected: { borderColor: Colors.secondary, backgroundColor: '#EFF6FF' },
  vehicleLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  vehicleLabelSelected: { color: Colors.secondary, fontWeight: FontWeight.bold },
  requirementsBox: {
    backgroundColor: '#F0FDF4', borderRadius: BorderRadius.lg,
    padding: Spacing.base, borderWidth: 1, borderColor: '#BBF7D0', gap: 8,
  },
  requirementsTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#166534', marginBottom: 4 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: FontSize.sm, color: '#166534', flex: 1 },
  button: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: Colors.secondary, height: 54,
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
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  successTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.text, textAlign: 'center' },
  successBody: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backBtn: {
    backgroundColor: Colors.secondary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base, borderRadius: BorderRadius['2xl'], marginTop: Spacing.sm,
  },
  backBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
