import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, FlatList, Image, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { driverRouteApi, driverPackageApi, uploadApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#6B7280', PICKING: '#F59E0B', PACKED: '#3B82F6',
  LABELED: '#6366F1', SORTED: '#8B5CF6', SCANNED_OUT: '#06B6D4',
  IN_TRANSIT: '#F97316', OUT_FOR_DELIVERY: '#EAB308',
  DELIVERED: '#10B981', DELIVERY_FAILED: '#EF4444',
};

export default function ScannerScreen() {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Delivery modal
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadPackages = useCallback(async () => {
    try {
      const res = await driverRouteApi.getMyPackages();
      setPackages(res.data.packages || []);
    } catch {
      // No packages or not assigned yet — not an error
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setIsLoading(true); loadPackages(); }, [loadPackages]));

  // Filter packages by search
  const filteredPackages = searchQuery.trim()
    ? packages.filter((p: any) =>
        p.package?.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.addressLine1?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : packages;

  const handleSelectPackage = (pkg: any) => {
    setSelectedPkg(pkg);
    setDeliveryModal(true);
    setProofPhotoUrl('');
    setOtpInput('');
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Camera permission required' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingPhoto(true);
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
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') || 'Upload failed' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedPkg || !proofPhotoUrl) {
      Toast.show({ type: 'error', text1: t('takePhoto') || 'Please take a delivery photo' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get GPS
      let gpsLat: number | undefined, gpsLng: number | undefined;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        gpsLat = loc.coords.latitude;
        gpsLng = loc.coords.longitude;
      } catch {}

      // 1. Submit delivery proof
      await driverRouteApi.submitDeliveryProof({
        packageId: selectedPkg.package?.id,
        riderId: undefined, // Backend will use auth user
        proofType: otpInput ? 'PHOTO_AND_OTP' : 'PHOTO',
        photoUrl: proofPhotoUrl,
        otp: otpInput || undefined,
        otpVerified: !!otpInput,
        gpsLat,
        gpsLng,
      });

      // 2. Update stop status to COMPLETED
      await driverRouteApi.updateStopStatus(selectedPkg.stopId, 'COMPLETED');

      // 3. Update package status to DELIVERED
      await driverPackageApi.updateStatus(selectedPkg.package?.id, 'DELIVERED');

      Toast.show({
        type: 'success',
        text1: t('proofSubmitted') || 'Delivered!',
        text2: `${selectedPkg.package?.trackingNumber} — ${selectedPkg.customerName}`,
      });

      setDeliveryModal(false);
      setSelectedPkg(null);
      loadPackages(); // Refresh list
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigate = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`);
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const renderPackageCard = ({ item }: { item: any }) => {
    const pkg = item.package;
    const statusColor = STATUS_COLORS[pkg?.status] || '#6B7280';

    return (
      <TouchableOpacity style={styles.packageCard} onPress={() => handleSelectPackage(item)} activeOpacity={0.7}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.trackingNum}>{pkg?.trackingNumber}</Text>
            <Text style={styles.orderNum}>#{item.orderNumber || '—'}</Text>
          </View>
          <View style={styles.stopBadge}>
            <Text style={styles.stopBadgeText}>{item.stopOrder}</Text>
          </View>
        </View>

        <View style={styles.customerRow}>
          <Ionicons name="person-outline" size={14} color="#9CA3AF" />
          <Text style={styles.customerName} numberOfLines={1}>{item.customerName || 'Customer'}</Text>
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color="#9CA3AF" />
          <Text style={styles.addressText} numberOfLines={1}>
            {item.addressLine1}{item.city ? `, ${item.city}` : ''}
          </Text>
        </View>

        {item.deliveryNotes ? (
          <View style={styles.notesRow}>
            <Ionicons name="chatbubble-outline" size={12} color="#F59E0B" />
            <Text style={styles.notesText} numberOfLines={1}>{item.deliveryNotes}</Text>
          </View>
        ) : null}

        <View style={styles.cardBottom}>
          <View style={[styles.statusChip, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusChipText, { color: statusColor }]}>{pkg?.status?.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.actionHint}>
            <Text style={styles.actionHintText}>{t('scanPackage') || 'Tap to deliver'}</Text>
            <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('scanPackage') || 'My Packages'}</Text>
        <Text style={styles.headerSubtitle}>
          {packages.length} {t('parcelStops') || 'packages'} {t('stopsLabel')?.split('/')[0] ? '' : 'to deliver'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tracking #, name, address..."
          placeholderTextColor="#6B7280"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredPackages.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="cube-outline" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matches' : (t('noRoutesAssigned') || 'No packages assigned')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search' : (t('noRoutesDesc') || 'Packages will appear when routes are assigned')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          keyExtractor={(item) => item.stopId}
          renderItem={renderPackageCard}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>

    {/* Delivery Confirmation Modal */}
    <Modal visible={deliveryModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Package Info */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('deliveryProofTitle') || 'Confirm Delivery'}</Text>
              <TouchableOpacity onPress={() => { setDeliveryModal(false); setSelectedPkg(null); }}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {selectedPkg && (
              <View style={styles.modalPkgInfo}>
                <Text style={styles.modalTracking}>{selectedPkg.package?.trackingNumber}</Text>
                <Text style={styles.modalCustomer}>{selectedPkg.customerName}</Text>
                <Text style={styles.modalAddress}>{selectedPkg.addressLine1}{selectedPkg.city ? `, ${selectedPkg.city}` : ''}</Text>

                {/* Quick Action Row */}
                <View style={styles.quickRow}>
                  <TouchableOpacity style={styles.quickBtn} onPress={() => handleNavigate(selectedPkg.lat, selectedPkg.lng)}>
                    <Ionicons name="navigate" size={18} color="#3B82F6" />
                    <Text style={styles.quickBtnText}>{t('navigateToStop') || 'Navigate'}</Text>
                  </TouchableOpacity>
                  {selectedPkg.customerPhone && (
                    <TouchableOpacity style={styles.quickBtn} onPress={() => handleCall(selectedPkg.customerPhone)}>
                      <Ionicons name="call" size={18} color="#10B981" />
                      <Text style={[styles.quickBtnText, { color: '#10B981' }]}>{t('callCustomer') || 'Call'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedPkg.deliveryNotes ? (
                  <View style={styles.modalNotes}>
                    <Ionicons name="chatbubble-outline" size={14} color="#F59E0B" />
                    <Text style={styles.modalNotesText}>{selectedPkg.deliveryNotes}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Take Delivery Photo (REQUIRED) */}
            <Text style={styles.photoLabel}>{t('deliveryProofDesc') || 'Take delivery photo (required)'}</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator color="#8B5CF6" />
              ) : proofPhotoUrl ? (
                <View style={styles.photoPreview}>
                  <Image source={{ uri: proofPhotoUrl }} style={styles.photoImage} />
                  <View style={styles.photoCheck}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                </View>
              ) : (
                <View style={styles.photoCta}>
                  <Ionicons name="camera" size={32} color="#8B5CF6" />
                  <Text style={styles.photoCtaText}>{t('takePhoto') || 'Take Photo'}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Optional OTP */}
            <Text style={styles.otpLabel}>{t('enterOtp') || 'OTP'} ({t('optional') || 'Optional'})</Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Enter OTP if provided"
              placeholderTextColor="#6B7280"
            />

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, (!proofPhotoUrl || isSubmitting) && { opacity: 0.5 }]}
              onPress={handleConfirmDelivery}
              disabled={!proofPhotoUrl || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>{t('markDelivered') || 'Confirm Delivery'}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: Spacing.sm,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  headerSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1F2937', marginHorizontal: Spacing.base, marginTop: Spacing.sm,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: '#374151',
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: '#F9FAFB' },

  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: Spacing.xl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  emptySubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', textAlign: 'center' },

  list: { padding: Spacing.base, paddingBottom: 40 },

  packageCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151', gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trackingNum: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#F9FAFB', fontFamily: 'monospace' },
  orderNum: { fontSize: FontSize.xs, color: '#6B7280', marginTop: 2 },
  stopBadge: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F620',
    justifyContent: 'center', alignItems: 'center',
  },
  stopBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#3B82F6' },

  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#D1D5DB' },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { fontSize: FontSize.sm, color: '#9CA3AF', flex: 1 },

  notesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.md },
  notesText: { fontSize: FontSize.xs, color: '#F59E0B', flex: 1 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusChipText: { fontSize: 10, fontWeight: FontWeight.bold },
  actionHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionHintText: { fontSize: FontSize.xs, color: '#3B82F6', fontWeight: FontWeight.semibold },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  modalPkgInfo: { backgroundColor: '#374151', borderRadius: BorderRadius.lg, padding: Spacing.base, gap: 6, marginBottom: 16 },
  modalTracking: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#F9FAFB', fontFamily: 'monospace' },
  modalCustomer: { fontSize: FontSize.base, color: '#D1D5DB', fontWeight: FontWeight.semibold },
  modalAddress: { fontSize: FontSize.sm, color: '#9CA3AF' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1F2937', paddingVertical: 10, borderRadius: BorderRadius.lg,
  },
  quickBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#3B82F6' },
  modalNotes: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F59E0B15', padding: 8, borderRadius: BorderRadius.md, marginTop: 6,
  },
  modalNotesText: { fontSize: FontSize.xs, color: '#F59E0B', flex: 1 },

  photoLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#D1D5DB', marginBottom: 8 },
  photoBtn: {
    borderWidth: 2, borderColor: '#374151', borderStyle: 'dashed',
    borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16,
    minHeight: 120, justifyContent: 'center', alignItems: 'center',
  },
  photoCta: { alignItems: 'center', gap: 8, padding: 20 },
  photoCtaText: { fontSize: FontSize.sm, color: '#8B5CF6', fontWeight: FontWeight.semibold },
  photoPreview: { width: '100%', height: 180, position: 'relative' },
  photoImage: { width: '100%', height: 180 },
  photoCheck: { position: 'absolute', top: 8, right: 8 },

  otpLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#D1D5DB', marginBottom: 6 },
  otpInput: {
    backgroundColor: '#374151', borderRadius: BorderRadius.lg, padding: Spacing.base,
    fontSize: FontSize.lg, color: '#F9FAFB', textAlign: 'center', letterSpacing: 6,
    marginBottom: 20,
  },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10B981', height: 56, borderRadius: BorderRadius.xl, marginBottom: 20,
  },
  confirmBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
