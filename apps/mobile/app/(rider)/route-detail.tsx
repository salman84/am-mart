import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { driverRouteApi, driverPackageApi, uploadApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STOP_COLORS: Record<string, string> = {
  PENDING: '#6B7280', IN_PROGRESS: '#F59E0B',
  COMPLETED: '#10B981', FAILED: '#EF4444',
  SKIPPED: '#9CA3AF', RESCHEDULED: '#8B5CF6',
};

const FAILED_REASONS = [
  { key: 'CUSTOMER_NOT_AVAILABLE', labelKey: 'failedReasonNotAvailable' },
  { key: 'WRONG_ADDRESS', labelKey: 'failedReasonWrongAddress' },
  { key: 'CUSTOMER_REQUESTED_LATER', labelKey: 'failedReasonRequestedLater' },
  { key: 'UNABLE_TO_CONTACT', labelKey: 'failedReasonCantContact' },
  { key: 'BUILDING_ACCESS_ISSUE', labelKey: 'failedReasonBuildingAccess' },
  { key: 'PACKAGE_DAMAGED', labelKey: 'failedReasonDamaged' },
  { key: 'WEATHER_EMERGENCY', labelKey: 'failedReasonWeather' },
  { key: 'REFUSED_BY_CUSTOMER', labelKey: 'failedReasonRefused' },
  { key: 'INCORRECT_COD_AMOUNT', labelKey: 'failedReasonCod' },
  { key: 'OTHER', labelKey: 'failedReasonOther' },
];

export default function RouteDetailScreen() {
  const { t } = useLanguage();
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const [routeData, setRouteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStop, setUpdatingStop] = useState<string | null>(null);

  // Delivery proof modal
  const [proofModal, setProofModal] = useState<{ visible: boolean; stop: any }>({ visible: false, stop: null });
  const [otpInput, setOtpInput] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  // Failed delivery modal
  const [failedModal, setFailedModal] = useState<{ visible: boolean; stop: any }>({ visible: false, stop: null });
  const [failedReason, setFailedReason] = useState('');
  const [failedNotes, setFailedNotes] = useState('');
  const [submittingFailed, setSubmittingFailed] = useState(false);

  const loadRoute = useCallback(async () => {
    if (!routeId) return;
    try {
      const res = await driverRouteApi.getRoute(routeId);
      setRouteData(res.data.route);
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') });
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => { loadRoute(); }, [loadRoute]);

  const handleNavigate = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`);
  };

  const handleCallCustomer = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleStartStop = async (stopId: string) => {
    setUpdatingStop(stopId);
    try {
      await driverRouteApi.updateStopStatus(stopId, 'IN_PROGRESS');
      Toast.show({ type: 'success', text1: t('routeInProgress') });
      loadRoute();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setUpdatingStop(null);
    }
  };

  const openDeliveryProof = (stop: any) => {
    setProofModal({ visible: true, stop });
    setOtpInput('');
    setProofPhotoUrl('');
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    try {
      const asset = result.assets[0];
      const fd = new FormData();
      fd.append('image', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'proof.jpg',
      } as any);
      const res = await uploadApi.uploadImage(fd);
      const url: string = res.data.url || res.data.imageUrl || res.data.path;
      setProofPhotoUrl(url);
      Toast.show({ type: 'success', text1: t('takePhoto') });
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') });
    }
  };

  const handleSubmitProof = async () => {
    if (!proofModal.stop) return;
    setSubmittingProof(true);
    try {
      let gpsLat, gpsLng;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsLat = loc.coords.latitude;
        gpsLng = loc.coords.longitude;
      } catch {}

      await driverRouteApi.submitDeliveryProof({
        packageId: proofModal.stop.packageId,
        riderId: routeData?.riderId,
        proofType: proofPhotoUrl ? 'PHOTO_AND_OTP' : 'OTP',
        photoUrl: proofPhotoUrl || undefined,
        otp: otpInput || undefined,
        otpVerified: !!otpInput,
        gpsLat, gpsLng,
      });

      // Update stop status
      await driverRouteApi.updateStopStatus(proofModal.stop.id, 'COMPLETED');

      // Update package status
      await driverPackageApi.updateStatus(proofModal.stop.packageId, 'DELIVERED');

      Toast.show({ type: 'success', text1: t('proofSubmitted') });
      setProofModal({ visible: false, stop: null });
      loadRoute();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setSubmittingProof(false);
    }
  };

  const openFailedDelivery = (stop: any) => {
    setFailedModal({ visible: true, stop });
    setFailedReason('');
    setFailedNotes('');
  };

  const handleSubmitFailed = async () => {
    if (!failedModal.stop || !failedReason) return;
    setSubmittingFailed(true);
    try {
      let gpsLat, gpsLng;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsLat = loc.coords.latitude;
        gpsLng = loc.coords.longitude;
      } catch {}

      await driverRouteApi.recordFailedDelivery({
        packageId: failedModal.stop.packageId,
        riderId: routeData?.riderId,
        attemptNumber: failedModal.stop.attemptNumber || 1,
        reason: failedReason,
        reasonNotes: failedNotes || undefined,
        gpsLat, gpsLng,
      });

      await driverRouteApi.updateStopStatus(failedModal.stop.id, 'FAILED');
      await driverPackageApi.updateStatus(failedModal.stop.packageId, 'DELIVERY_FAILED');

      Toast.show({ type: 'success', text1: t('failedReportSubmitted') });
      setFailedModal({ visible: false, stop: null });
      loadRoute();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setSubmittingFailed(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const stops = routeData?.stops || [];

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>{routeData?.routeNumber}</Text>
          <Text style={styles.headerSubtitle}>
            {t('stopsLabel').replace('{completed}', String(routeData?.completedStops || 0)).replace('{total}', String(routeData?.totalStops || 0))}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${STOP_COLORS[routeData?.status] || '#6B7280'}20` }]}>
          <Text style={[styles.statusBadgeText, { color: STOP_COLORS[routeData?.status] || '#6B7280' }]}>
            {routeData?.status?.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Route Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{routeData?.totalStops || 0}</Text>
              <Text style={styles.summaryLabel}>{t('parcelStops')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{routeData?.completedStops || 0}</Text>
              <Text style={styles.summaryLabel}>{t('markDelivered')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{routeData?.failedStops || 0}</Text>
              <Text style={styles.summaryLabel}>{t('markFailed')}</Text>
            </View>
          </View>
          {/* Progress */}
          {(routeData?.totalStops || 0) > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${Math.round(((routeData?.completedStops || 0) / routeData.totalStops) * 100)}%`,
                }]} />
              </View>
            </View>
          )}
        </View>

        {/* Stops List */}
        <Text style={styles.sectionTitle}>{t('parcelStops')} ({stops.length})</Text>
        {stops.map((stop: any, index: number) => {
          const stopColor = STOP_COLORS[stop.status] || '#6B7280';
          const isUpdating = updatingStop === stop.id;

          return (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={[styles.stopOrderBadge, { backgroundColor: `${stopColor}20` }]}>
                  <Text style={[styles.stopOrderText, { color: stopColor }]}>{stop.stopOrder}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{stop.customerName || t('stopNumber').replace('{number}', String(stop.stopOrder))}</Text>
                  <Text style={styles.addressText} numberOfLines={2}>{stop.addressLine1}{stop.city ? `, ${stop.city}` : ''}</Text>
                </View>
                <View style={[styles.miniStatusBadge, { backgroundColor: `${stopColor}20` }]}>
                  <Text style={[styles.miniStatusText, { color: stopColor }]}>{stop.status}</Text>
                </View>
              </View>

              {stop.package && (
                <View style={styles.trackingRow}>
                  <Ionicons name="qr-code-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.trackingText}>{stop.package.trackingNumber}</Text>
                </View>
              )}

              {stop.deliveryNotes && (
                <View style={styles.notesRow}>
                  <Ionicons name="chatbubble-outline" size={14} color="#F59E0B" />
                  <Text style={styles.notesText}>{stop.deliveryNotes}</Text>
                </View>
              )}

              {/* Action Buttons */}
              {stop.status === 'PENDING' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.stopActionBtn, { backgroundColor: '#374151' }]}
                    onPress={() => handleNavigate(stop.lat, stop.lng)}
                  >
                    <Ionicons name="navigate" size={14} color="#60A5FA" />
                    <Text style={[styles.stopActionText, { color: '#60A5FA' }]}>{t('navigateToStop')}</Text>
                  </TouchableOpacity>
                  {stop.customerPhone && (
                    <TouchableOpacity
                      style={[styles.stopActionBtn, { backgroundColor: '#374151' }]}
                      onPress={() => handleCallCustomer(stop.customerPhone)}
                    >
                      <Ionicons name="call" size={14} color="#10B981" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.stopActionBtn, { backgroundColor: '#3B82F6' }, isUpdating && { opacity: 0.6 }]}
                    onPress={() => handleStartStop(stop.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <ActivityIndicator size="small" color="#fff" /> :
                      <Text style={styles.stopActionTextWhite}>{t('startRoute')}</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {stop.status === 'IN_PROGRESS' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.stopActionBtn, { backgroundColor: '#374151' }]}
                    onPress={() => handleNavigate(stop.lat, stop.lng)}
                  >
                    <Ionicons name="navigate" size={14} color="#60A5FA" />
                    <Text style={[styles.stopActionText, { color: '#60A5FA' }]}>{t('navigateToStop')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stopActionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => openDeliveryProof(stop)}
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.stopActionTextWhite}>{t('markDelivered')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stopActionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => openFailedDelivery(stop)}
                  >
                    <Ionicons name="close-circle" size={14} color="#fff" />
                    <Text style={styles.stopActionTextWhite}>{t('markFailed')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>

    {/* Delivery Proof Modal */}
    <Modal visible={proofModal.visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{t('deliveryProofTitle')}</Text>
          <Text style={styles.modalSubtitle}>{t('deliveryProofDesc')}</Text>

          <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={24} color={proofPhotoUrl ? '#10B981' : '#9CA3AF'} />
            <Text style={[styles.photoBtnText, proofPhotoUrl && { color: '#10B981' }]}>
              {proofPhotoUrl ? '✓ Photo taken' : t('takePhoto')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>{t('enterOtp')}</Text>
          <TextInput
            style={styles.otpInput}
            value={otpInput}
            onChangeText={setOtpInput}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="OTP"
            placeholderTextColor="#6B7280"
          />
          <Text style={styles.inputHint}>{t('otpFromCustomer')}</Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel}
              onPress={() => setProofModal({ visible: false, stop: null })}>
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, submittingProof && { opacity: 0.6 }]}
              onPress={handleSubmitProof}
              disabled={submittingProof}
            >
              {submittingProof ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={styles.modalConfirmText}>{t('submitProof')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Failed Delivery Modal */}
    <Modal visible={failedModal.visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { maxHeight: '80%' }]}>
          <Text style={styles.modalTitle}>{t('failedDeliveryTitle')}</Text>
          <Text style={styles.modalSubtitle}>{t('failedDeliveryDesc')}</Text>

          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {FAILED_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.key}
                style={[styles.reasonOption, failedReason === reason.key && styles.reasonOptionActive]}
                onPress={() => setFailedReason(reason.key)}
              >
                <View style={[styles.reasonRadio, failedReason === reason.key && styles.reasonRadioActive]} />
                <Text style={[styles.reasonText, failedReason === reason.key && { color: '#F9FAFB' }]}>
                  {t(reason.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={styles.notesInput}
            value={failedNotes}
            onChangeText={setFailedNotes}
            placeholder="Additional notes..."
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={2}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel}
              onPress={() => setFailedModal({ visible: false, stop: null })}>
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: '#EF4444' },
                (!failedReason || submittingFailed) && { opacity: 0.6 }]}
              onPress={handleSubmitFailed}
              disabled={!failedReason || submittingFailed}
            >
              {submittingFailed ? <ActivityIndicator color="#fff" size="small" /> :
                <Text style={styles.modalConfirmText}>{t('submitFailedReport')}</Text>}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  headerSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  statusBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: FontSize.xxl || 28, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  summaryLabel: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 4 },
  progressContainer: { marginTop: 12 },
  progressBar: { height: 4, backgroundColor: '#374151', borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: '#3B82F6' },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#F9FAFB', marginTop: 4 },
  stopCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151', gap: 10,
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopOrderBadge: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  stopOrderText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  customerName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: '#F9FAFB' },
  addressText: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  miniStatusText: { fontSize: 10, fontWeight: FontWeight.bold },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackingText: { fontSize: FontSize.xs, color: '#9CA3AF', fontFamily: 'monospace' },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B10', padding: 8, borderRadius: BorderRadius.md },
  notesText: { fontSize: FontSize.xs, color: '#F59E0B', flex: 1 },
  actionRow: { flexDirection: 'row', gap: 8 },
  stopActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: BorderRadius.lg,
  },
  stopActionText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  stopActionTextWhite: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#fff' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB', marginBottom: 4 },
  modalSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', marginBottom: Spacing.lg },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.base, backgroundColor: '#374151', borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
  },
  photoBtnText: { fontSize: FontSize.base, color: '#9CA3AF', fontWeight: FontWeight.semibold },
  inputLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#D1D5DB', marginBottom: 6 },
  otpInput: {
    backgroundColor: '#374151', borderRadius: BorderRadius.lg, padding: Spacing.base,
    fontSize: FontSize.xl, color: '#F9FAFB', textAlign: 'center', letterSpacing: 8,
  },
  inputHint: { fontSize: FontSize.xs, color: '#6B7280', marginTop: 4, marginBottom: Spacing.lg },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: Spacing.base },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: '#374151', alignItems: 'center' },
  modalCancelText: { color: '#9CA3AF', fontWeight: FontWeight.semibold },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.xl, backgroundColor: '#10B981', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: FontWeight.bold },
  reasonOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  reasonOptionActive: { backgroundColor: '#374151', borderRadius: BorderRadius.md },
  reasonRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#6B7280' },
  reasonRadioActive: { borderColor: '#EF4444', backgroundColor: '#EF4444' },
  reasonText: { fontSize: FontSize.base, color: '#9CA3AF' },
  notesInput: {
    backgroundColor: '#374151', borderRadius: BorderRadius.lg, padding: Spacing.base,
    fontSize: FontSize.base, color: '#F9FAFB', marginTop: Spacing.base, minHeight: 60,
    textAlignVertical: 'top',
  },
});
