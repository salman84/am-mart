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

export default function ForgotPasswordScreen() {
  const [phone, setPhone]       = useState('');
  const [name, setName]         = useState('');
  const [emailOrUser, setEmailOrUser] = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async () => {
    if (!phone.trim() || !name.trim()) {
      setError('Phone number and full name are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password-request', {
        phone: phone.trim(),
        name: name.trim(),
        emailOrUsername: emailOrUser.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
          <Text style={styles.successTitle}>Request Submitted</Text>
          <Text style={styles.successMsg}>
            Your password reset request has been submitted. Our support team will review it and contact you.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Back to Login</Text>
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

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Please submit your account recovery request. Our support team will review your information and help you reset your password.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+82 10-XXXX-XXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your registered full name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email or Username (optional)</Text>
            <TextInput
              style={styles.input}
              value={emailOrUser}
              onChangeText={setEmailOrUser}
              placeholder="Enter email or username if available"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Request</Text>}
          </TouchableOpacity>

          <Text style={styles.note}>
            Have a reset code?{' '}
            <Text style={styles.link} onPress={() => router.push('/(auth)/reset-password-new' as any)}>
              Enter code here
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  scroll:       { padding: Spacing.lg, paddingTop: Spacing.base },
  backBtn:      { marginBottom: Spacing.lg },
  title:        { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: Spacing.sm },
  subtitle:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 20 },
  field:        { marginBottom: Spacing.base },
  label:        { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    fontSize: FontSize.base, color: Colors.text, backgroundColor: '#FAFAFA',
  },
  error:        { color: Colors.danger, fontSize: FontSize.sm, marginBottom: Spacing.base },
  btn: {
    backgroundColor: Colors.primary, paddingVertical: 15,
    borderRadius: BorderRadius['2xl'], alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.base,
  },
  btnText:      { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  note:         { textAlign: 'center', fontSize: FontSize.sm, color: Colors.textSecondary },
  link:         { color: Colors.primary, fontWeight: FontWeight.semibold },
  successBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: 16 },
  successTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text },
  successMsg:   { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
