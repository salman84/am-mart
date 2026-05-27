import React, { useState, useEffect } from 'react';
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
  PREPAID:    ['No monthly contract', 'Pay as you go', 'Flexible top-up'],
  DATA_ONLY:  ['Data-only plan', 'Use with WiFi calling', 'Great for tablets'],
  VOICE_DATA: ['Calls + Data + SMS', 'Full featured plan', 'Best for everyday use'],
};

const ORDER_STEPS = [
  { key: 'PENDING',          label: 'Order Placed',        icon: 'checkmark-circle-outline' },
  { key: 'CONFIRMED',        label: 'Payment Confirmed',   icon: 'card-outline' },
  { key: 'PROCESSING',       label: 'Gathering SIM',       icon: 'settings-outline' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the Way',          icon: 'bicycle-outline' },
  { key: 'DELIVERED',        label: 'Delivered',           icon: 'gift-outline' },
];

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function OrderTracker({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>('PENDING');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isCancelled, setIsCancelled] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await simApi.getOrder(orderId);
      const order = res.data?.simOrder ?? res.data;
      if (order?.status) {
        setStatus(order.status);
        setAdminNotes(order.adminNotes || '');
        setIsCancelled(order.status === 'CANCELLED');
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <ActivityIndicator color={Colors.sim} style={{ marginTop: 20 }} />;

  const currentStep = STATUS_ORDER.indexOf(status);

  if (isCancelled) {
    return (
      <View style={trackerStyles.cancelledBox}>
        <Ionicons name="close-circle" size={48} color={Colors.danger} />
        <Text style={trackerStyles.cancelledTitle}>Order Rejected</Text>
        <Text style={trackerStyles.cancelledText}>
          {adminNotes || 'The requested number is not available. Please choose another number.'}
        </Text>
        <TouchableOpacity style={trackerStyles.tryAgainBtn} onPress={() => router.replace('/(customer)/sim' as any)}>
          <Text style={trackerStyles.tryAgainText}>Choose Another Number</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={trackerStyles.container}>
      <Text style={trackerStyles.title}>Order Status</Text>
      {ORDER_STEPS.map((step, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        const pending = i > currentStep;
        return (
          <View key={step.key} style={trackerStyles.stepRow}>
            {/* Line connector */}
            <View style={trackerStyles.lineCol}>
              <View style={[trackerStyles.circle,
                done   ? trackerStyles.circleDone :
                active ? trackerStyles.circleActive :
                         trackerStyles.circlePending,
              ]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Ionicons name={step.icon as any} size={14} color={active ? '#fff' : Colors.textLight} />
                )}
              </View>
              {i < ORDER_STEPS.length - 1 && (
                <View style={[trackerStyles.lineSegment, done ? trackerStyles.lineDone : trackerStyles.linePending]} />
              )}
            </View>
            <View style={trackerStyles.stepInfo}>
              <Text style={[trackerStyles.stepLabel,
                done ? trackerStyles.labelDone : active ? trackerStyles.labelActive : trackerStyles.labelPending,
              ]}>
                {step.label}
              </Text>
              {active && (
                <Text style={trackerStyles.stepSub}>Currently in this stage</Text>
              )}
            </View>
          </View>
        );
      })}
      {adminNotes ? (
        <View style={trackerStyles.notesBox}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
          <Text style={trackerStyles.notesText}>{adminNotes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function SimReserveScreen() {
  const params = useLocalSearchParams<{ simId: string; number: string; carrier: string; simType: string; price: string }>();
  const [idDocUri, setIdDocUri] = useState<string | null>(null);
  const [idDocBack, setIdDocBack] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'review' | 'id-upload' | 'submitted'>('review');
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
    setIsLoading(true);
    try {
      await simApi.submitOrder(reservedOrderId, { idDocFrontUrl: idDocUri, idDocBackUrl: idDocBack });
      Toast.show({ type: 'success', text1: 'Application submitted!', text2: 'Admin will review and process your order.' });
      setStep('submitted');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Submission failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'submitted' ? router.replace('/(customer)' as any) : router.back()}>
          <Ionicons name={step === 'submitted' ? 'home-outline' : 'arrow-back'} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'review' ? 'Confirm Reservation' : step === 'id-upload' ? 'Upload ID Document' : 'Order Tracking'}
        </Text>
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

        {/* ── Step: Review ── */}
        {step === 'review' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan Features</Text>
              {(PLAN_FEATURES[params.simType] || PLAN_FEATURES.PREPAID).map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What happens next?</Text>
              {[
                { step: '1', text: 'SIM reserved for 15 minutes' },
                { step: '2', text: 'Upload your ID document' },
                { step: '3', text: 'Admin reviews & approves your number' },
                { step: '4', text: 'SIM gathered and dispatched' },
                { step: '5', text: 'SIM delivered to your address' },
              ].map((s) => (
                <View key={s.step} style={styles.processRow}>
                  <View style={styles.processStep}><Text style={styles.processStepText}>{s.step}</Text></View>
                  <Text style={styles.processText}>{s.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.warning}>
              <Ionicons name="time-outline" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>This SIM number will be reserved for 15 minutes once you confirm. Please complete the ID upload promptly.</Text>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, isLoading && styles.disabled]} onPress={reserve} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Reserve This Number</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── Step: ID Upload ── */}
        {step === 'id-upload' && (
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
                    <Text style={styles.uploadedText}>Front uploaded ✓</Text>
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
                    <Text style={styles.uploadedText}>Back uploaded ✓</Text>
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

        {/* ── Step: Submitted — Live Order Tracker ── */}
        {step === 'submitted' && reservedOrderId && (
          <>
            <View style={styles.submittedBanner}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.submittedTitle}>Application Submitted!</Text>
                <Text style={styles.submittedText}>Track your SIM order status below. Updates automatically every 15 seconds.</Text>
              </View>
            </View>

            <OrderTracker orderId={reservedOrderId} />

            <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(customer)' as any)}>
              <Ionicons name="home-outline" size={18} color={Colors.primary} />
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Tracker styles ── */
const trackerStyles = StyleSheet.create({
  container:      { backgroundColor: '#fff', borderRadius: 16, padding: 16, ...Shadow.sm },
  title:          { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  stepRow:        { flexDirection: 'row', gap: 12 },
  lineCol:        { alignItems: 'center', width: 32 },
  circle:         { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  circleDone:     { backgroundColor: Colors.primary },
  circleActive:   { backgroundColor: Colors.sim },
  circlePending:  { backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
  lineSegment:    { width: 2, flex: 1, minHeight: 20, marginVertical: 2 },
  lineDone:       { backgroundColor: Colors.primary },
  linePending:    { backgroundColor: '#E5E7EB' },
  stepInfo:       { flex: 1, paddingBottom: 12 },
  stepLabel:      { fontSize: 14, fontWeight: '600' },
  labelDone:      { color: Colors.primary },
  labelActive:    { color: Colors.sim },
  labelPending:   { color: Colors.textLight },
  stepSub:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  notesBox:       { flexDirection: 'row', gap: 8, marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10 },
  notesText:      { flex: 1, fontSize: 12, color: Colors.primary },
  cancelledBox:   { alignItems: 'center', padding: 24, backgroundColor: '#FEF2F2', borderRadius: 16 },
  cancelledTitle: { fontSize: 18, fontWeight: '800', color: Colors.danger, marginTop: 12, marginBottom: 8 },
  cancelledText:  { fontSize: 13, color: '#B91C1C', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  tryAgainBtn:    { backgroundColor: Colors.sim, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  tryAgainText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});

/* ─── Main styles ── */
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content:      { padding: Spacing.base, gap: 12, paddingBottom: 40 },

  simCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  simIcon:      { width: 52, height: 52, borderRadius: 12, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.base },
  simInfo:      { flex: 1 },
  simNumber:    { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text, fontFamily: 'monospace' },
  simBadges:    { flexDirection: 'row', gap: 6, marginTop: 4 },
  carrierBadge: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#8B5CF620', borderRadius: BorderRadius.full },
  carrierText:  { fontSize: FontSize.xs, color: Colors.sim, fontWeight: FontWeight.bold },
  typeBadge:    { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full },
  typeText:     { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  simPrice:     { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.sim },

  section:          { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  sectionTitle:     { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  featureRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  featureText:      { fontSize: FontSize.sm, color: Colors.text },
  processRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  processStep:      { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  processStepText:  { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  processText:      { fontSize: FontSize.sm, color: Colors.textSecondary },

  warning:      { flexDirection: 'row', gap: 8, backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: Spacing.base },
  warningText:  { flex: 1, fontSize: FontSize.sm, color: Colors.warning, lineHeight: 20 },
  timerBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg, padding: Spacing.base },
  timerText:    { fontSize: FontSize.sm, color: Colors.warning, fontWeight: FontWeight.semibold },

  uploadArea:       { height: 120, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', gap: 8 },
  uploadAreaFilled: { borderColor: Colors.primary, borderStyle: 'solid', backgroundColor: Colors.primaryLight },
  uploadedRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadedText:     { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },
  uploadText:       { fontSize: FontSize.sm, color: Colors.textSecondary },
  uploadSubtext:    { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center' },

  confirmBtn:     { backgroundColor: Colors.sim, height: 54, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center' },
  disabled:       { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },

  submittedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ECFDF5', borderRadius: 14, padding: 16 },
  submittedTitle:  { fontSize: 15, fontWeight: '700', color: Colors.primary },
  submittedText:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },

  homeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14 },
  homeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
