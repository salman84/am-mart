import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { sellerApi, uploadApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const APPROVAL_COLORS: Record<string, string> = {
  APPROVED: Colors.primary,
  PENDING: Colors.warning,
  REJECTED: Colors.danger,
  SUSPENDED: Colors.danger,
};

export default function SellerProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/(auth)/welcome');
  };

  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    contactPhone: '',
    contactEmail: '',
    logoUrl: '',
  });

  const loadProfile = async () => {
    try {
      const res = await sellerApi.getProfile();
      const p = res.data;
      setProfile(p);
      setForm({
        storeName: p.storeName || '',
        storeDescription: p.storeDescription || '',
        contactPhone: p.contactPhone || '',
        contactEmail: p.contactEmail || '',
        logoUrl: p.logoUrl || '',
      });
    } catch {
      Toast.show({ type: 'error', text1: t('failedLoadProfile') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('image', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'logo.jpg',
      } as any);
      const res = await uploadApi.uploadImage(fd);
      const url: string = res.data.url || res.data.imageUrl || res.data.path;
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch {
      Toast.show({ type: 'error', text1: t('logoUploadFailed') });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form.storeName.trim()) {
      Toast.show({ type: 'error', text1: t('storeNameRequired') });
      return;
    }
    setIsSaving(true);
    try {
      await sellerApi.updateProfile({
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        logoUrl: form.logoUrl || undefined,
      });
      Toast.show({ type: 'success', text1: t('profileUpdated') });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedSave') });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const statusColor = APPROVAL_COLORS[profile?.approvalStatus] || Colors.textSecondary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('storeProfileTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Status Badge */}
        <View style={[styles.statusCard, { borderColor: `${statusColor}40` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{t('accountStatus')}</Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>
              {profile?.approvalStatus || 'UNKNOWN'}
            </Text>
          </View>
          {profile?.commissionRate != null && (
            <View style={styles.commissionWrap}>
              <Text style={styles.commissionLabel}>{t('commissionLabel')}</Text>
              <Text style={styles.commissionValue}>{profile.commissionRate}%</Text>
            </View>
          )}
        </View>

        {/* Logo */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('storeLogo')}</Text>
          <View style={styles.logoRow}>
            <TouchableOpacity style={styles.logoWrap} onPress={pickLogo} disabled={uploadingLogo}>
              {uploadingLogo ? (
                <ActivityIndicator color={Colors.primary} />
              ) : form.logoUrl ? (
                <Image source={{ uri: form.logoUrl }} style={styles.logoImg} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="storefront-outline" size={36} color={Colors.textLight} />
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, gap: 4 }}>
              <TouchableOpacity style={styles.uploadLogoBtn} onPress={pickLogo} disabled={uploadingLogo}>
                <Ionicons name="camera-outline" size={16} color={Colors.primary} />
                <Text style={styles.uploadLogoBtnText}>
                  {form.logoUrl ? t('changeLogo') : t('uploadLogo')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.logoHint}>{t('logoHint')}</Text>
            </View>
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('storeInformation')}</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              {t('storeNameLabel')} <Text style={{ color: Colors.danger }}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('storeNameLabel')}
              placeholderTextColor={Colors.textLight}
              value={form.storeName}
              onChangeText={(v) => setForm((f) => ({ ...f, storeName: v }))}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('storeDescriptionLabel')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('productDescPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={form.storeDescription}
              onChangeText={(v) => setForm((f) => ({ ...f, storeDescription: v }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('contactInformation')}</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('contactPhoneLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 010-1234-5678"
              placeholderTextColor={Colors.textLight}
              value={form.contactPhone}
              onChangeText={(v) => setForm((f) => ({ ...f, contactPhone: v }))}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('contactEmailLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder="store@email.com"
              placeholderTextColor={Colors.textLight}
              value={form.contactEmail}
              onChangeText={(v) => setForm((f) => ({ ...f, contactEmail: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

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
              <Text style={styles.saveBtnText}>{t('save')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 14, paddingBottom: 40 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.base, borderWidth: 1.5, ...Shadow.sm,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statusValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginTop: 2 },
  commissionWrap: { alignItems: 'flex-end' },
  commissionLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  commissionValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, gap: 14, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  logoWrap: {
    width: 80, height: 80, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  logoImg: { width: 80, height: 80 },
  logoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  uploadLogoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
  },
  uploadLogoBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  logoHint: { fontSize: FontSize.xs, color: Colors.textLight },
  field: { gap: 4 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  input: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    fontSize: FontSize.base, color: Colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, backgroundColor: Colors.primary, height: 54, borderRadius: BorderRadius['2xl'],
  },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: `${Colors.danger}30`,
    height: 54, borderRadius: BorderRadius['2xl'],
  },
  logoutText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.danger },
});
