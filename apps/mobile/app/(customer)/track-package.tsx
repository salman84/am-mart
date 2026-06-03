import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { customerTrackingApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STATUS_STEPS = [
  { key: 'CREATED', icon: 'receipt-outline', color: '#6B7280' },
  { key: 'PICKING', icon: 'hand-left-outline', color: '#F59E0B' },
  { key: 'PACKED', icon: 'cube-outline', color: '#3B82F6' },
  { key: 'LABELED', icon: 'pricetag-outline', color: '#6366F1' },
  { key: 'SORTED', icon: 'git-branch-outline', color: '#8B5CF6' },
  { key: 'SCANNED_OUT', icon: 'scan-outline', color: '#06B6D4' },
  { key: 'IN_TRANSIT', icon: 'car-outline', color: '#F97316' },
  { key: 'OUT_FOR_DELIVERY', icon: 'bicycle-outline', color: '#EAB308' },
  { key: 'DELIVERED', icon: 'checkmark-circle', color: '#10B981' },
];

const STATUS_LABEL_KEYS: Record<string, string> = {
  CREATED: 'packageStatusCreated',
  PICKING: 'packageStatusPicking',
  PACKED: 'packageStatusPacked',
  LABELED: 'packageStatusLabeled',
  SORTED: 'packageStatusSorted',
  SCANNED_OUT: 'packageStatusScannedOut',
  IN_TRANSIT: 'packageStatusInTransit',
  OUT_FOR_DELIVERY: 'packageStatusOutForDelivery',
  DELIVERED: 'packageStatusDelivered',
  DELIVERY_FAILED: 'packageStatusDeliveryFailed',
  RETURNED: 'packageStatusReturned',
};

export default function TrackPackageScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ trackingNumber?: string }>();
  const [trackingInput, setTrackingInput] = useState(params.trackingNumber || '');
  const [packageData, setPackageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proofData, setProofData] = useState<any>(null);
  const [showProof, setShowProof] = useState(false);

  const handleTrack = async () => {
    if (!trackingInput.trim()) return;
    setIsLoading(true);
    setPackageData(null);
    setProofData(null);
    try {
      const res = await customerTrackingApi.trackPackage(trackingInput.trim());
      setPackageData(res.data.package);

      // If delivered, try to load proof
      if (res.data.package?.status === 'DELIVERED') {
        try {
          const proofRes = await customerTrackingApi.getDeliveryProof(res.data.package.id);
          setProofData(proofRes.data.proof);
        } catch {}
      }
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-track if tracking number passed
  React.useEffect(() => {
    if (params.trackingNumber) handleTrack();
  }, []);

  const getCurrentStepIndex = () => {
    if (!packageData) return -1;
    return STATUS_STEPS.findIndex(s => s.key === packageData.status);
  };

  const currentStep = getCurrentStepIndex();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('trackingTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Search Box */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>{t('enterTrackingNumber')}</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={trackingInput}
              onChangeText={setTrackingInput}
              placeholder="PKG-XXXXXX-XXXXX"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleTrack}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleTrack} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && !packageData && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {packageData && (
          <>
            {/* Package Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="qr-code-outline" size={18} color={Colors.primary} />
                <Text style={styles.trackingNum}>{packageData.trackingNumber}</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('status')}</Text>
                  <Text style={[styles.infoValue, {
                    color: packageData.status === 'DELIVERED' ? '#10B981' :
                           packageData.status === 'DELIVERY_FAILED' ? '#EF4444' : Colors.text,
                  }]}>
                    {t(STATUS_LABEL_KEYS[packageData.status] || 'packageStatusCreated')}
                  </Text>
                </View>
                {packageData.shipment?.order?.orderNumber && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('orderNumber') || 'Order'}</Text>
                    <Text style={styles.infoValue}>#{packageData.shipment.order.orderNumber}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Progress Timeline */}
            <View style={styles.timelineCard}>
              <Text style={styles.cardTitle}>{t('trackingTimeline')}</Text>
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <View key={step.key} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      {index < STATUS_STEPS.length - 1 && (
                        <View style={[styles.timelineLine, isCompleted && { backgroundColor: step.color }]} />
                      )}
                      <View style={[styles.timelineDot, isCompleted && { backgroundColor: step.color, borderColor: step.color }]}>
                        <Ionicons name={step.icon as any} size={14} color={isCompleted ? '#fff' : Colors.textLight} />
                      </View>
                    </View>
                    <View style={[styles.timelineContent, isCurrent && styles.timelineContentActive]}>
                      <Text style={[styles.timelineLabel, isCompleted && { color: Colors.text, fontWeight: FontWeight.semibold }]}>
                        {t(STATUS_LABEL_KEYS[step.key] || 'packageStatusCreated')}
                      </Text>
                      {isCurrent && packageData.updatedAt && (
                        <Text style={styles.timelineDate}>
                          {new Date(packageData.updatedAt).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Scan History */}
            {packageData.scans?.length > 0 && (
              <View style={styles.scansCard}>
                <Text style={styles.cardTitle}>{t('trackingTimeline')}</Text>
                {packageData.scans.slice(0, 10).map((scan: any) => (
                  <View key={scan.id} style={styles.scanRow}>
                    <View style={styles.scanDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanType}>{scan.scanType?.replace(/_/g, ' ')}</Text>
                      {scan.locationName && <Text style={styles.scanLocation}>{scan.locationName}</Text>}
                    </View>
                    <Text style={styles.scanTime}>
                      {new Date(scan.scannedAt).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Delivery Proof */}
            {proofData && (
              <View style={styles.proofCard}>
                <Text style={styles.cardTitle}>{t('deliveryProofTitle')}</Text>
                {proofData.photoUrl && (
                  <Image source={{ uri: proofData.photoUrl }} style={styles.proofImage} resizeMode="cover" />
                )}
                <View style={styles.proofDetails}>
                  {proofData.recipientName && (
                    <Text style={styles.proofText}>
                      {t('proofRecipient').replace('{name}', proofData.recipientName)}
                    </Text>
                  )}
                  <Text style={styles.proofText}>
                    {t('proofDeliveredAt').replace('{time}', new Date(proofData.deliveredAt).toLocaleString())}
                  </Text>
                  {proofData.safePlaceDesc && (
                    <Text style={styles.proofText}>
                      {proofData.safePlaceDesc}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  searchCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm,
  },
  searchLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    fontSize: FontSize.base, color: Colors.text, fontFamily: 'monospace',
  },
  searchBtn: {
    width: 48, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingBox: { padding: 40, alignItems: 'center' },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackingNum: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, fontFamily: 'monospace' },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  infoValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: 2 },
  timelineCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm,
  },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 12 },
  timelineRow: { flexDirection: 'row', minHeight: 48 },
  timelineLeft: { width: 36, alignItems: 'center', position: 'relative' },
  timelineLine: {
    position: 'absolute', top: 28, left: 17, width: 2, bottom: -4,
    backgroundColor: Colors.border,
  },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  timelineContent: { flex: 1, paddingLeft: 8, paddingBottom: 16 },
  timelineContentActive: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: 8, marginLeft: 4 },
  timelineLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  timelineDate: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  scansCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm,
  },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  scanDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  scanType: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  scanLocation: { fontSize: FontSize.xs, color: Colors.textSecondary },
  scanTime: { fontSize: FontSize.xs, color: Colors.textLight },
  proofCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, gap: 12,
  },
  proofImage: { width: '100%', height: 200, borderRadius: BorderRadius.lg },
  proofDetails: { gap: 4 },
  proofText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
