import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import api from '../../src/services/api';

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-zA-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#E5E7EB', '#EF4444', '#F97316', '#EAB308', '#22C55E'];
  return { score, label: labels[score] || '', color: colors[score] };
}

export default function ResetPasswordNewScreen() {
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const strength = getStrength(password);

  const handleReset = async () => {
    setError('');
    if (!token.trim())             { setError('Please enter your reset code.'); return; }
    if (password.length < 8)       { setError('Password must be at least 8 characters.'); return; }
    if (!/[a-zA-Z]/.test(password)) { setError('Password must include at least one letter.'); return; }
    if (!/\d/.test(password))       { setError('Password must include at least one number.'); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Password must include at least one special character (!@#$%...).'); return;
    }
    if (password !== confirm)       { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await api.post('/auth/reset-password-token', {
        token: token.trim(),
        newPassword: password,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successMsg}>
            Your password has been reset successfully. Please log in again.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter the reset code provided by our support team.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Reset Code *</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste your reset code here"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>New Password *</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 chars, letter, number, special"
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1,2,3,4].map(i => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : '#E5E7EB' }]} />
                ))}
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter new password"
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#fff' },
  scroll:        { padding: Spacing.lg, paddingTop: Spacing.base },
  backBtn:       { marginBottom: Spacing.lg },
  title:         { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: Spacing.sm },
  subtitle:      { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 20 },
  field:         { marginBottom: Spacing.base },
  label:         { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    fontSize: FontSize.base, color: Colors.text, backgroundColor: '#FAFAFA',
  },
  pwRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:        { padding: 10 },
  strengthRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  strengthBar:   { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: FontWeight.semibold, minWidth: 40 },
  error:         { color: Colors.danger, fontSize: FontSize.sm, marginBottom: Spacing.base },
  btn: {
    backgroundColor: Colors.primary, paddingVertical: 15,
    borderRadius: BorderRadius['2xl'], alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnText:       { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  successBox:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 16 },
  successTitle:  { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text },
  successMsg:    { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
