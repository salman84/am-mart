import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp' | 'reset' | 'done'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const sendOtp = async () => {
    if (!phone.trim()) { Toast.show({ type: 'error', text1: 'Enter your phone number' }); return; }
    setIsLoading(true);
    try {
      await authApi.forgotPassword(phone);
      setStep('otp');
      Toast.show({ type: 'success', text1: 'OTP sent!', text2: `Reset code sent to ${phone}` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Phone not found' });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { Toast.show({ type: 'error', text1: 'Enter all 6 digits' }); return; }
    setStep('reset');
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' }); return; }
    if (newPassword !== confirmPassword) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }
    setIsLoading(true);
    try {
      await authApi.resetPassword({ phone, otp: otp.join(''), newPassword });
      setStep('done');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Reset failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '').slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.back} onPress={() => {
            if (step === 'otp') setStep('phone');
            else if (step === 'reset') setStep('otp');
            else router.back();
          }}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-open-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>
              {step === 'phone' ? 'Forgot Password' : step === 'otp' ? 'Verify OTP' : step === 'reset' ? 'New Password' : 'Password Reset!'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'phone' ? "Enter your phone number and we'll send a reset code"
                : step === 'otp' ? `Enter the 6-digit code sent to ${phone}`
                : step === 'reset' ? 'Enter your new password'
                : 'Your password has been reset successfully'}
            </Text>
          </View>

          {step === 'phone' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="+82 10-0000-0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={Colors.textLight} />
              </View>
              <TouchableOpacity style={[styles.btn, isLoading && styles.disabled]} onPress={sendOtp} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.form}>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { inputRefs.current[i] = ref; }}
                    style={[styles.otpInput, !!digit && styles.otpInputFilled]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(i, v)}
                    onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus(); }}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>
              <TouchableOpacity style={[styles.btn, otp.join('').length < 6 && styles.disabled]} onPress={verifyOtp} disabled={otp.join('').length < 6}>
                <Text style={styles.btnText}>Verify Code</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'reset' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={[styles.input, { paddingRight: 44 }]} placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPass} placeholderTextColor={Colors.textLight} />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPass} placeholderTextColor={Colors.textLight} />
              </View>
              <TouchableOpacity style={[styles.btn, isLoading && styles.disabled]} onPress={resetPassword} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 'done' && (
            <View style={styles.form}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.btnText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  back: { marginTop: Spacing.base, width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
  iconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  form: { gap: Spacing.base },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, height: 54, ...Shadow.sm },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.text },
  eyeBtn: { position: 'absolute', right: Spacing.base },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpInput: { flex: 1, height: 56, borderRadius: BorderRadius.lg, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text },
  otpInputFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  btn: { backgroundColor: Colors.primary, height: 54, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center', ...Shadow.md },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  successIcon: { alignItems: 'center', paddingVertical: Spacing.xl },
});
