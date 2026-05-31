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
import { useLanguage } from '../../../src/i18n';
import { useSelector } from 'react-redux';
import { RootState } from '../../../src/store';

const STATUS_ORDER = ['PENDING', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

function OrderTracker({ orderId }: { orderId: string }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<string>('PENDING');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isCancelled, setIsCancelled] = useState(false);
  const [loading, setLoading] = useState(true);

  const ORDER_STEPS = [
    { key: 'PENDING',          label: t('simOrderPlaced'),       icon: 'checkmark-circle-outline' },
    { key: 'CONFIRMED',        label: t('simPaymentConfirmed'),  icon: 'card-outline' },
    { key: 'PROCESSING',       label: t('simGathering'),         icon: 'settings-outline' },
    { key: 'OUT_FOR_DELIVERY', label: t('simOnTheWay'),          icon: 'bicycle-outline' },
    { key: 'DELIVERED',        label: t('simDelivered'),         icon: 'gift-outline' },
  ];

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
        <Text style={trackerStyles.cancelledTitle}>{t('orderRejected')}</Text>
        <Text style={trackerStyles.cancelledText}>
          {adminNotes || t('chooseAnotherNumber')}
        </Text>
        <TouchableOpacity style={trackerStyles.tryAgainBtn} onPress={() => router.replace('/(customer)/sim' as any)}>
          <Text style={trackerStyles.tryAgainText}>{t('chooseAnotherNumber')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={trackerStyles.container}>
      <Text style={trackerStyles.title}>{t('orderStatusTitle')}</Text>
      {ORDER_STEPS.map((step, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        const pending = i > currentStep;
        return (
          <View key={step.key} style={trackerStyles.stepRow}>
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
                <Text style={trackerStyles.stepSub}>{t('currentlyInStage')}</Text>
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
  const params = useLocalSearchParams<{ simId: string; number: string; carrier: string; simType: string; price: string; chosenLastFour?: string }>();
  const { t } = useLanguage();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₨');
  const [idDocUri, setIdDocUri] = useState<string | null>(null);
  const [idDocBack, setIdDocBack] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'review' | 'id-upload' | 'submitted'>('review');
  const [reservedOrderId, setReservedOrderId] = useState<string | null>(null);

  const PLAN_FEATURES: Record<string, string[]> = {
    PREPAID:    [t('simFeatPrepaid1'), t('simFeatPrepaid2'), t('simFeatPrepaid3')],
    DATA_ONLY:  [t('simFeatDataOnly1'), t('simFeatDataOnly2'), t('simFeatDataOnly3')],
    VOICE_DATA: [t('simFeatVoiceData1'), t('simFeatVoiceData2'), t('simFeatVoiceData3')],
  };

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
      const res = await simApi.reserve(params.simId, params.chosenLastFour);
      setReservedOrderId(res.data.simOrder.id);
      setStep('id-upload');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('reservationFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  const submitOrder = async () => {
    if (!idDocUri) { Toast.show({ type: 'error', text1: t('pleaseUploadId') }); return; }
    if (!reservedOrderId) return;
    setIsLoading(true);
    try {
      await simApi.submitOrder(reservedOrderId, { idDocFrontUrl: idDocUri, idDocBackUrl: idDocBack });
      Toast.show({ type: 'success', text1: t('applicationSubmitted'), text2: t('trackOrderBelow') });
      setStep('submitted');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('submissionFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  const headerTitle = step === 'review'
    ? t('confirmReservation')
    : step === 'id-upload'
    ? t('uploadId')
    : t('orderTracking');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'submitted' ? router.replace('/(customer)' as any) : router.back()}>
          <Ionicons name={step === 'submitted' ? 'home-outline' : 'arrow-back'} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
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
          <Text style={styles.simPrice}>{currency}{Number(params.price).toLocaleString()}</Text>
        </View>

        {/* ── Step: Review ── */}
        {step === 'review' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('planFeatures')}</Text>
              {(PLAN_FEATURES[params.simType] || PLAN_FEATURES.PREPAID).map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('whatHappensNext')}</Text>
              {[
                { step: '1', text: t('simStep1') },
                { step: '2', text: t('simStep2') },
                { step: '3', text: t('simStep3') },
                { step: '4', text: t('simStep4') },
                { step: '5', text: t('simStep5') },
              ].map((s) => (
                <View key={s.step} style={styles.processRow}>
                  <View style={styles.processStep}><Text style={styles.processStepText}>{s.step}</Text></View>
                  <Text style={styles.processText}>{s.text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.warning}>
              <Ionicons name="time-outline" size={20} color={Colors.warning} />
              <Text style={styles.warningText}>{t('simReserveWarning')}</Text>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, isLoading && styles.disabled]} onPress={reserve} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>{t('reserveThisNumber')}</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── Step: ID Upload ── */}
        {step === 'id-upload' && (
          <>
            <View style={styles.timerBanner}>
              <Ionicons name="time-outline" size={18} color={Colors.warning} />
              <Text style={styles.timerText}>{t('completeUpload')}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('idFrontRequired')}</Text>
              <TouchableOpacity style={[styles.uploadArea, !!idDocUri && styles.uploadAreaFilled]} onPress={() => pickImage(true)}>
                {idDocUri ? (
                  <View style={styles.uploadedRow}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    <Text style={styles.uploadedText}>{t('frontUploaded')}</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={36} color={Colors.textLight} />
                    <Text style={styles.uploadText}>{t('tapToUploadFront')}</Text>
                    <Text style={styles.uploadSubtext}>{t('idDocTypes')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('idBackOptional')}</Text>
              <TouchableOpacity style={[styles.uploadArea, !!idDocBack && styles.uploadAreaFilled]} onPress={() => pickImage(false)}>
                {idDocBack ? (
                  <View style={styles.uploadedRow}>
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    <Text style={styles.uploadedText}>{t('backUploaded')}</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={36} color={Colors.textLight} />
                    <Text style={styles.uploadText}>{t('tapToUploadBack')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.confirmBtn, (isLoading || !idDocUri) && styles.disabled]} onPress={submitOrder} disabled={isLoading || !idDocUri}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>{t('submitApplication')}</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* ── Step: Submitted — Live Order Tracker ── */}
        {step === 'submitted' && reservedOrderId && (
          <>
            <View style={styles.submittedBanner}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.submittedTitle}>{t('applicationSubmitted')}</Text>
                <Text style={styles.submittedText}>{t('trackOrderBelow')}</Text>
              </View>
            </View>

            <OrderTracker orderId={reservedOrderId} />

            <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(customer)' as any)}>
              <Ionicons name="home-outline" size={18} color={Colors.primary} />
              <Text style={styles.homeBtnText}>{t('backToHome')}</Text>
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
