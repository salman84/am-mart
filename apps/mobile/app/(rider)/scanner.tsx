import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driverPackageApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STATUS_COLORS: Record<string, string> = {
  CREATED: '#6B7280', PICKING: '#F59E0B', PACKED: '#3B82F6',
  LABELED: '#6366F1', SORTED: '#8B5CF6', SCANNED_OUT: '#06B6D4',
  IN_TRANSIT: '#F97316', OUT_FOR_DELIVERY: '#EAB308',
  DELIVERED: '#10B981', DELIVERY_FAILED: '#EF4444',
  RETURNED: '#EC4899',
};

export default function ScannerScreen() {
  const { t } = useLanguage();
  const [trackingInput, setTrackingInput] = useState('');
  const [packageData, setPackageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    if (!trackingInput.trim()) return;
    setIsLoading(true);
    setPackageData(null);
    try {
      const res = await driverPackageApi.trackPackage(trackingInput.trim());
      setPackageData(res.data.package);
      Toast.show({ type: 'success', text1: t('packageScanned') || 'Package found' });
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') || 'Package not found' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!packageData) return;
    setIsScanning(true);
    try {
      await driverPackageApi.addScan(packageData.id, {
        scanType: 'DRIVER_PICKUP',
        notes: 'Confirmed at pickup',
      });
      Toast.show({ type: 'success', text1: t('packageScanned') || 'Package confirmed' });
      setPackageData({ ...packageData, status: 'SCANNED_OUT' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanOut = async () => {
    if (!packageData) return;
    setIsScanning(true);
    try {
      await driverPackageApi.addScan(packageData.id, {
        scanType: 'DRIVER_SCAN_OUT',
        notes: 'Driver scan out for delivery',
      });
      Toast.show({ type: 'success', text1: t('packageScanned') || 'Scan recorded' });
      setPackageData({ ...packageData, status: 'SCANNED_OUT' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('scanPackage') || 'Scan Package'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Scan Input */}
        <View style={styles.scanCard}>
          <View style={styles.scanIconWrap}>
            <Ionicons name="scan" size={40} color="#8B5CF6" />
          </View>
          <Text style={styles.scanTitle}>{t('scanPackage') || 'Scan Package'}</Text>
          <Text style={styles.scanSubtitle}>
            {t('enterTrackingNumber') || 'Enter tracking number or scan barcode'}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={trackingInput}
              onChangeText={setTrackingInput}
              placeholder="PKG-XXXXXX-XXXXX"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleScan}
            />
            <TouchableOpacity style={styles.scanBtn} onPress={handleScan} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Package Result */}
        {packageData && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.trackingNum}>{packageData.trackingNumber}</Text>
                {packageData.barcode && (
                  <Text style={styles.barcodeText}>{packageData.barcode}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[packageData.status] || '#6B7280'}20` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[packageData.status] || '#6B7280' }]}>
                  {packageData.status?.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            {/* Package Details */}
            <View style={styles.detailsGrid}>
              {packageData.weight && (
                <View style={styles.detailItem}>
                  <Ionicons name="scale-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.detailText}>{packageData.weight} kg</Text>
                </View>
              )}
              {packageData.fulfillmentCenter && (
                <View style={styles.detailItem}>
                  <Ionicons name="business-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.detailText}>{packageData.fulfillmentCenter.name}</Text>
                </View>
              )}
              {packageData.sortZone && (
                <View style={styles.detailItem}>
                  <Ionicons name="git-branch-outline" size={14} color="#9CA3AF" />
                  <Text style={styles.detailText}>{packageData.sortZone}</Text>
                </View>
              )}
              <View style={styles.detailItem}>
                <Ionicons name="repeat-outline" size={14} color="#9CA3AF" />
                <Text style={styles.detailText}>
                  {packageData.deliveryAttempts}/{packageData.maxAttempts}
                </Text>
              </View>
            </View>

            {/* Scan History */}
            {packageData.scans?.length > 0 && (
              <View style={styles.scansSection}>
                <Text style={styles.scansTitle}>{t('trackingTimeline') || 'Scan History'}</Text>
                {packageData.scans.slice(0, 5).map((scan: any) => (
                  <View key={scan.id} style={styles.scanRow}>
                    <View style={styles.scanDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanType}>{scan.scanType?.replace(/_/g, ' ')}</Text>
                      {scan.notes && <Text style={styles.scanNotes}>{scan.notes}</Text>}
                    </View>
                    <Text style={styles.scanTime}>
                      {new Date(scan.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {['CREATED', 'PICKING', 'PACKED', 'LABELED', 'SORTED'].includes(packageData.status) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={handleConfirmPickup}
                  disabled={isScanning}
                >
                  {isScanning ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>{t('confirmPickup') || 'Confirm Pickup'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {packageData.status === 'SORTED' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#06B6D4' }]}
                  onPress={handleScanOut}
                  disabled={isScanning}
                >
                  {isScanning ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="exit-outline" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>{t('scanOut') || 'Scan Out'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  content: { padding: Spacing.base, gap: 16, paddingBottom: 40 },

  scanCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: '#374151', gap: 12,
  },
  scanIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#8B5CF615',
    justifyContent: 'center', alignItems: 'center',
  },
  scanTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  scanSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', textAlign: 'center' },
  inputRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 8 },
  input: {
    flex: 1, backgroundColor: '#374151', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    fontSize: FontSize.base, color: '#F9FAFB', fontFamily: 'monospace',
  },
  scanBtn: {
    width: 52, height: 52, borderRadius: BorderRadius.lg, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center',
  },

  resultCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151', gap: 14,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trackingNum: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB', fontFamily: 'monospace' },
  barcodeText: { fontSize: FontSize.xs, color: '#6B7280', fontFamily: 'monospace', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: FontSize.sm, color: '#D1D5DB' },

  scansSection: { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12, gap: 8 },
  scansTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#D1D5DB' },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6' },
  scanType: { fontSize: FontSize.sm, color: '#D1D5DB' },
  scanNotes: { fontSize: FontSize.xs, color: '#6B7280' },
  scanTime: { fontSize: FontSize.xs, color: '#6B7280' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: BorderRadius.xl,
  },
  actionBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
