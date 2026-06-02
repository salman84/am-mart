import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

type StatusType = 'pending' | 'rejected' | 'suspended';

const STATUS_CONFIG: Record<StatusType, {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  titleKey: string;
  messageKey: string;
}> = {
  pending: {
    icon: 'hourglass-outline',
    iconColor: '#F59E0B',
    bgColor: '#FEF3C7',
    titleKey: 'statusPendingTitle',
    messageKey: 'statusPendingMessage',
  },
  rejected: {
    icon: 'close-circle-outline',
    iconColor: '#EF4444',
    bgColor: '#FEE2E2',
    titleKey: 'statusRejectedTitle',
    messageKey: 'statusRejectedMessage',
  },
  suspended: {
    icon: 'ban-outline',
    iconColor: '#6B7280',
    bgColor: '#F3F4F6',
    titleKey: 'statusSuspendedTitle',
    messageKey: 'statusSuspendedMessage',
  },
};

export default function AccountStatusScreen() {
  const { status, message, role } = useLocalSearchParams<{
    status: string; message?: string; role?: string;
  }>();
  const { t } = useLanguage();

  const statusType = (status as StatusType) || 'pending';
  const config = STATUS_CONFIG[statusType] || STATUS_CONFIG.pending;

  const roleLabel = role === 'SELLER' ? t('statusRoleSeller') : role === 'RIDER' ? t('statusRoleRider') : '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={64} color={config.iconColor} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t(config.titleKey)}</Text>

        {/* Role Badge */}
        {roleLabel ? (
          <View style={styles.roleBadge}>
            <Ionicons
              name={role === 'SELLER' ? 'storefront-outline' : 'bicycle-outline'}
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        ) : null}

        {/* Message */}
        <Text style={styles.message}>
          {message || t(config.messageKey)}
        </Text>

        {/* Info cards based on status */}
        {statusType === 'pending' && (
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#F59E0B" />
              <Text style={styles.infoText}>{t('statusPendingTime')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="notifications-outline" size={18} color="#F59E0B" />
              <Text style={styles.infoText}>{t('statusPendingNotify')}</Text>
            </View>
          </View>
        )}

        {statusType === 'rejected' && (
          <View style={[styles.infoBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#EF4444" />
              <Text style={[styles.infoText, { color: '#991B1B' }]}>{t('statusRejectedContact')}</Text>
            </View>
          </View>
        )}

        {statusType === 'suspended' && (
          <View style={[styles.infoBox, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}>
            <View style={styles.infoRow}>
              <Ionicons name="help-circle-outline" size={18} color="#6B7280" />
              <Text style={[styles.infoText, { color: '#374151' }]}>{t('statusSuspendedContact')}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('backToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.xl, gap: 16,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base,
  },
  title: {
    fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold,
    color: Colors.text, textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  roleBadgeText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  message: {
    fontSize: FontSize.base, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 24, paddingHorizontal: Spacing.base,
  },
  infoBox: {
    width: '100%', backgroundColor: '#FFFBEB', borderRadius: BorderRadius.lg,
    padding: Spacing.base, gap: 12, borderWidth: 1, borderColor: '#FDE68A',
    marginTop: Spacing.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: FontSize.sm, color: '#92400E', flex: 1 },
  actions: { width: '100%', marginTop: Spacing.xl, gap: 12 },
  primaryBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 54,
    borderRadius: BorderRadius['2xl'],
  },
  primaryBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
