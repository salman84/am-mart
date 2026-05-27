import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { simApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import Toast from 'react-native-toast-message';

const PLAN_FEATURES: Record<string, string[]> = {
  PREPAID: ['No monthly contract', 'Pay as you go', 'Flexible top-up'],
  DATA_ONLY: ['Data-only plan', 'Use with WiFi calling', 'Great for tablets'],
  VOICE_DATA: ['Calls + Data + SMS', 'Full featured plan', 'Best for everyday use'],
};

export default function SimReserveScreen() {
  const params = useLocalSearchParams<{ simId: string; number: string; carrier: string; simType: string; price: string }>();
  const [idDocUri, setIdDocUri] = useState<string | null>(null);
  const [idDocBack, setIdDocBack] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'review' | 'id-upload' | 'submitting'>('review');
  const [reservedOrderId, setReservedOrderId] = useState<string | null>(null);

  const pickImage = async (isFront: boolean) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      if (isFront) setIdDocUri(result.assets[0].uri);
      else setIdDocBack(result.assets[0].uri);
    }
  };

  const reserve = async () => {
    setIsLoading(true);
    try {
      const res = await simApi.reserve(params.simId);
      setReservedOrderId(res.data.simOrder.id);
      setStep('id-upload');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Reservation failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const submitOrder = async () => {
    if (!idDocUri) { Toast.show({ type: 'error', text1: 'Please upload your ID document' }); return; }
    if (!reservedOrderId) return;
    setStep('submitting');
    setIsLoading(true);
    try {
      await simApi.submitOrder(reservedOrderId, { idDocFrontUrl: idDocUri, idDocBackUrl: idDocBack });
      Toast.show({ type: 'success', text1: 'Application submitted!', text2: 'We will review and process your order.' });
      router.replace('/(customer)');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Submission failed' });
      setStep('id-upload');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{step === 'review' ? 'Confirm Reservation' : 'Upload ID Document'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SIM Card Info */}
        <View style={styles.simCard}>
          <View style={styles.simIcon}>
            <Ionicons name="phone-portrait-outline" size={32} color={Colors.sim} />
          </View>
          <View style={styles.simInfo}>
            <Text style={styles.simNumber}>{params.number}</Text>
            <View style={styles.simBadges}>
              <View style={styles.carrierBadge}><Text style={styles.carrierText}>{params.carrier}</Text></View>
              <View style={styles.typeBadge}><Text style={styles.typeText}>{params.simType?.replace('_', ' ')}</Text></View>
            </View>
          </View>
          <Text style={styles.simPrice}>₩{Number(params.price).toLocaleString()}</Text>
        </View>

        {step === 'review' && (
          <>
            {/* Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan Features</Text>
              {(PLAN_FEATURES[params.simType] || PLAN_FEATURES.PREPAID).map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Process */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What happens next?</Text>
              {[
                { step: '1', text: 'SIM reserved for 15 minutes' },
                { step: '2', text: 'Upload your ID document' },
                { step: '3', text: 'Admin reviews your application' },
                { step: '4', text: 'SIM delivered to your address' },
              ].map((s) => (
                <View key={s.step} style={styles.processRow}>
                  <View style={styles.processStep}><Text style={styles.processStepText}>{s.step}</Text></View>
                  <Text style={styles.processText}>{s.text}</Text>
                </View>
              ))}
            </View>

            {/* Warning */}
            <View style={styles.warning}>
              <Ionicons name="time-outline" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>This SIM number will be reserved for 15 minutes once you confirm. Please complete the ID upload promptly.</Text>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, isLoading && styles.disabled]} onPress={reserve} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Reserve This Number</Text>}
            </TouchableOpacity>
          </>
        )}

        {(step === 'id-upload' || step === 'submitting') && (
          <>
            <View style={styles.timerBanner}>
              <Ionicons name="time-outline" size={18} color={Colors.warning} />
              <Text style={styles.timerText}>Complete ID upload within 15 minutes</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ID Document — Front *</Text>
              <TouchableOpacity style={[styles.uploadArea, !!idDocUri && styles.uploadAreaFilled]} onPress={() => pickImage(true)}>
                {idDocUri ? (
                  <View style={styles.uploadedRow}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    <Text style={styles.uploadedText}>Front uploaded</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={36} color={Colors.textLight} />
                    <Text style={styles.uploadText}>Tap to upload front of ID</Text>
                    <Text style={styles.uploadSubtext}>Passport, National ID, or Driver's License</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ID Document — Back (optional)</Text>
              <TouchableOpacity style={[styles.uploadArea, !!idDocBack && styles.uploadAreaFilled]} onPress={() => pickImage(false)}>
                {idDocBack ? (
                  <View style={styles.uploadedRow}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    <Text style={styles.uploadedText}>Back uploaded</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={36} color={Colors.textLight} />
                    <Text style={styles.uploadText}>Tap to upload back of ID</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, (isLoading || !idDocUri) && styles.disabled]} onPress={submitOrder} disabled={isLoading || !idDocUri}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Submit Application</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  simCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  simIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.base },
  simInfo: { flex: 1 },
  simNumber: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text, fontFamily: 'monospace' },
  simBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  carrierBadge: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#8B5CF620', borderRadius: BorderRadius.full },
  carrierText: { fontSize: FontSize.xs, color: Colors.sim, fontWeight: FontWeight.bold },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full },
  typeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  simPrice: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.sim },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  featureText: { fontSize: FontSize.sm, color: Colors.text },
  processRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  processStep: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  processStepText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  processText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  warning: { flexDirection: 'row', gap: 8, backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: Spacing.base },
  warningText: { flex: 1, fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20 },
  timerBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: Spacing.base },
  timerText: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: FontWeight.semibold },
  uploadArea: { height: 120, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadAreaFilled: { borderColor: Colors.primary, borderStyle: 'solid', backgroundColor: Colors.primaryLight },
  uploadedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadedText: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
  uploadText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  uploadSubtext: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center' },
  confirmBtn: { backgroundColor: Colors.sim, height: 54, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
