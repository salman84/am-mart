import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Switch, Alert, Linking, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { riderApi } from '../../src/services/api';
import * as Location from 'expo-location';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: Colors.info, ACCEPTED: Colors.secondary,
  HEADING_TO_PICKUP: Colors.warning, PICKED_UP: Colors.secondary,
  OUT_FOR_DELIVERY: Colors.topup, DELIVERED: Colors.primary,
};

export default function RiderDeliveriesScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { t } = useLanguage();

  // NEXT_STATUS labels must use t() — defined inside component
  const NEXT_STATUS: Record<string, { status: string; label: string }> = {
    ASSIGNED: { status: 'ACCEPTED', label: t('riderAcceptOrder') },
    ACCEPTED: { status: 'HEADING_TO_PICKUP', label: t('riderHeadingToPickup') },
    HEADING_TO_PICKUP: { status: 'PICKED_UP', label: t('riderMarkPickedUp') },
    PICKED_UP: { status: 'OUT_FOR_DELIVERY', label: t('riderOutForDelivery') },
    OUT_FOR_DELIVERY: { status: 'DELIVERED', label: t('riderMarkDelivered') },
  };

  const [assignments, setAssignments] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [otpModal, setOtpModal] = useState<{ visible: boolean; assignmentId: string }>({ visible: false, assignmentId: '' });
  const [otpInput, setOtpInput] = useState('');

  const loadAssignments = useCallback(async () => {
    try {
      const res = await riderApi.getAssignments();
      setAssignments(res.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const toggleOnline = async (value: boolean) => {
    let lat, lng;
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('locationRequired'), t('enableLocation'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    }
    try {
      await riderApi.updateOnlineStatus(value, lat, lng);
      setIsOnline(value);
      Toast.show({ type: 'success', text1: value ? t('nowOnline') : t('nowOffline') });
    } catch {
      Toast.show({ type: 'error', text1: t('failedUpdateStatus') });
    }
  };

  const handleUpdateStatus = async (assignmentId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    if (next.status === 'DELIVERED') {
      setOtpInput('');
      setOtpModal({ visible: true, assignmentId });
      return;
    }

    setUpdatingId(assignmentId);
    try {
      await riderApi.updateDeliveryStatus(assignmentId, next.status);
      Toast.show({ type: 'success', text1: `Status: ${next.status.replace(/_/g, ' ')}` });
      loadAssignments();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedUpdateStatus') });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNavigate = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    const url = `https://maps.google.com/?daddr=${lat},${lng}`;
    Linking.openURL(url);
  };

  const handleCallCustomer = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderAssignment = ({ item }: { item: any }) => {
    const { order } = item;
    const statusColor = STATUS_COLORS[item.status] || Colors.textSecondary;
    const nextAction = NEXT_STATUS[item.status];
    const isUpdating = updatingId === item.id;

    return (
      <View style={styles.assignmentCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>#{order?.orderNumber}</Text>
            <Text style={styles.itemCount}>{order?.items?.length} item{order?.items?.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerSection}>
          <View style={styles.personRow}>
            <View style={styles.personIcon}>
              <Ionicons name="person-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.personInfo}>
              <Text style={styles.personName}>{order?.customer?.user?.fullName}</Text>
              <Text style={styles.personAddress} numberOfLines={1}>{order?.address?.addressLine1}, {order?.address?.city}</Text>
            </View>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallCustomer(order?.customer?.user?.phone)}
            >
              <Ionicons name="call" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigate Buttons */}
        <View style={styles.navigateRow}>
          {['ACCEPTED', 'HEADING_TO_PICKUP'].includes(item.status) && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: Colors.secondary }]}
              onPress={() => handleNavigate(item.pickupLat, item.pickupLng)}
            >
              <Ionicons name="navigate" size={14} color="#fff" />
              <Text style={styles.navText}>{t('pickupLocation')}</Text>
            </TouchableOpacity>
          )}
          {['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(item.status) && (
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: Colors.primary }]}
              onPress={() => handleNavigate(item.dropoffLat, item.dropoffLng)}
            >
              <Ionicons name="navigate" size={14} color="#fff" />
              <Text style={styles.navText}>{t('deliveryLocation')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Button */}
        {nextAction && (
          <TouchableOpacity
            style={[styles.actionButton, isUpdating && styles.disabled, { backgroundColor: statusColor }]}
            onPress={() => handleUpdateStatus(item.id, item.status)}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.actionText}>{nextAction.label}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('myDeliveries')}</Text>
          <Text style={styles.headerSubtitle}>Hello, {user?.fullName?.split(' ')[0]}</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineLabel, { color: isOnline ? Colors.primary : Colors.textSecondary }]}>
            {isOnline ? t('riderOnline') : t('riderOffline')}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={isOnline ? Colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="warning-outline" size={20} color={Colors.warning} />
          <Text style={styles.offlineText}>{t('riderOfflineBanner')}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      ) : assignments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bicycle-outline" size={72} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>{t('noActiveDeliveries')}</Text>
          <Text style={styles.emptySubtitle}>{isOnline ? t('waitingForOrders') : t('goOnlineToReceive')}</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={renderAssignment}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshing={false}
          onRefresh={loadAssignments}
        />
      )}
    </SafeAreaView>

    {/* OTP Modal for delivery confirmation */}
    <Modal visible={otpModal.visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{t('deliveryOtp')}</Text>
          <Text style={styles.modalSubtitle}>{t('deliveryOtpSubtitle')}</Text>
          <TextInput
            style={styles.otpInput}
            value={otpInput}
            onChangeText={setOtpInput}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Enter OTP"
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setOtpModal({ visible: false, assignmentId: '' })}>
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, !otpInput && styles.disabled]}
              onPress={async () => {
                if (!otpInput) return;
                setOtpModal({ visible: false, assignmentId: '' });
                setUpdatingId(otpModal.assignmentId);
                try {
                  await riderApi.updateDeliveryStatus(otpModal.assignmentId, 'DELIVERED', { otp: otpInput });
                  Toast.show({ type: 'success', text1: t('deliveryConfirmed') });
                  loadAssignments();
                } catch (e: any) {
                  Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedConfirmDelivery') });
                } finally {
                  setUpdatingId(null);
                }
              }}
            >
              <Text style={styles.modalConfirmText}>{t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  headerSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  onlineLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#92400E20', padding: Spacing.sm,
    paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#92400E40',
  },
  offlineText: { fontSize: FontSize.sm, color: Colors.warning },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB', marginTop: Spacing.base },
  emptySubtitle: { fontSize: FontSize.base, color: '#9CA3AF', marginTop: Spacing.xs, textAlign: 'center' },
  listContent: { padding: Spacing.base },
  assignmentCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.base },
  orderNumber: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  itemCount: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  customerSection: { marginBottom: Spacing.base },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  personIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  personInfo: { flex: 1 },
  personName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: '#F9FAFB' },
  personAddress: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  callButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  navigateRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BorderRadius.lg },
  navText: { color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: BorderRadius['2xl'],
  },
  disabled: { opacity: 0.6 },
  actionText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.xl, width: '100%' },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB', marginBottom: Spacing.xs },
  modalSubtitle: { fontSize: FontSize.base, color: '#9CA3AF', marginBottom: Spacing.lg },
  otpInput: { backgroundColor: '#374151', borderRadius: BorderRadius.lg, padding: Spacing.base, fontSize: FontSize.xl, color: '#F9FAFB', textAlign: 'center', letterSpacing: 8, marginBottom: Spacing.lg },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  modalCancelText: { color: '#9CA3AF', fontWeight: FontWeight.semibold },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.xl, backgroundColor: Colors.primary, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: FontWeight.bold },
});
