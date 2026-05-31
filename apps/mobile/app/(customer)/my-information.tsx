import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { userApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

export default function MyInformationScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    setIsLoading(true);
    userApi.getProfile()
      .then((res) => {
        const u = res.data?.user ?? res.data;
        setFullName(u?.fullName || '');
        setEmail(u?.email || '');
        setPhone(u?.phone || '');
      })
      .catch(() => {
        // Fallback to redux state
        setFullName(user?.fullName || '');
        setEmail(user?.email || '');
        setPhone(user?.phone || '');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Name cannot be empty' });
      return;
    }
    setIsSaving(true);
    try {
      await userApi.updateProfile({ fullName: fullName.trim(), email: email.trim() || undefined });
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      setIsEditing(false);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Information</Text>
        <TouchableOpacity
          style={styles.editToggleBtn}
          onPress={() => {
            if (isEditing) {
              // Cancel — reset to fetched values
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Text style={styles.editToggleText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Avatar */}
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {fullName?.[0]?.toUpperCase() || user?.fullName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <Text style={styles.avatarName}>{fullName || user?.fullName}</Text>
            </View>

            {/* Fields Card */}
            <View style={styles.card}>
              {/* Full Name */}
              <View style={styles.field}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="person-outline" size={16} color={Colors.primary} />
                  <Text style={styles.fieldLabelText}>Full Name</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                ) : (
                  <Text style={styles.fieldValue}>{fullName || '—'}</Text>
                )}
              </View>

              <View style={styles.divider} />

              {/* Phone (read-only always) */}
              <View style={styles.field}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="call-outline" size={16} color={Colors.primary} />
                  <Text style={styles.fieldLabelText}>Phone Number</Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.fieldValue}>{phone || '—'}</Text>
                  <View style={styles.lockedBadge}>
                    <Ionicons name="lock-closed-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.lockedText}>Not editable</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Email */}
              <View style={styles.field}>
                <View style={styles.fieldLabel}>
                  <Ionicons name="mail-outline" size={16} color={Colors.primary} />
                  <Text style={styles.fieldLabelText}>Email Address</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email (optional)"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={styles.fieldValue}>{email || '—'}</Text>
                )}
              </View>
            </View>

            {/* Info note */}
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                Your phone number is used for login and cannot be changed. Contact support if you need to update it.
              </Text>
            </View>

            {/* Save Button */}
            {isEditing && (
              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.disabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn:         { width: 36 },
  headerTitle:     { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  editToggleBtn:   { width: 50, alignItems: 'flex-end' },
  editToggleText:  { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.primary },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:         { padding: Spacing.base, gap: 14, paddingBottom: 40 },

  avatarWrap:      { alignItems: 'center', paddingVertical: 20 },
  avatar:          { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText:      { fontSize: 36, fontWeight: FontWeight.extrabold, color: '#fff' },
  avatarName:      { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },

  card:            { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, ...Shadow.sm, overflow: 'hidden' },
  field:           { paddingHorizontal: Spacing.base, paddingVertical: 14 },
  fieldLabel:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fieldLabelText:  { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue:      { fontSize: FontSize.base, color: Colors.text, fontWeight: FontWeight.medium },
  divider:         { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.base },
  readOnlyRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  lockedText:      { fontSize: FontSize.xs, color: Colors.textSecondary },

  input: {
    fontSize: FontSize.base, color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: BorderRadius.lg, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
  },

  infoNote:        { flexDirection: 'row', gap: 8, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, ...Shadow.sm },
  infoText:        { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  saveBtn:         { backgroundColor: Colors.primary, height: 54, borderRadius: BorderRadius['2xl'], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText:     { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  disabled:        { opacity: 0.6 },
});
