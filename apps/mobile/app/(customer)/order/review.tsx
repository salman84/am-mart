import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { reviewsApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import { useLanguage } from '../../../src/i18n';

export default function ReviewScreen() {
  const { orderId, productId, productName } = useLocalSearchParams<{
    orderId: string;
    productId: string;
    productName: string;
  }>();
  const { t } = useLanguage();

  const decodedProductName = productName ? decodeURIComponent(productName) : 'Product';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('ratingRequired'), t('selectStarRating'));
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.create({ productId, orderId, rating, comment });
      Toast.show({ type: 'success', text1: t('reviewSubmitted'), text2: t('reviewThankYou') });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedSubmitReview') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leaveReview')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.productTitle}>{t('rateProductTitle').replace('{name}', decodedProductName)}</Text>

          {/* Star Rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Text style={[styles.star, star <= rating && styles.starFilled]}>
                  {star <= rating ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 0 ? t('tapToRate') : [
              '', t('ratePoor'), t('rateFair'), t('rateGood'), t('rateVeryGood'), t('rateExcellent'),
            ][rating]}
          </Text>

          {/* Comment Input */}
          <Text style={styles.label}>{t('yourReviewOptional')}</Text>
          <TextInput
            style={styles.textArea}
            placeholder={t('shareYourExperience')}
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={5}
            value={comment}
            onChangeText={setComment}
            textAlignVertical="top"
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, (submitting || rating === 0) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t('submitReviewBtn')}</Text>
            )}
          </TouchableOpacity>
        </View>
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
  content: { padding: Spacing.base, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, ...Shadow.sm,
  },
  productTitle: {
    fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text,
    textAlign: 'center', marginBottom: Spacing.lg,
  },
  starsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: Spacing.xs,
  },
  starBtn: { padding: 4 },
  star: { fontSize: 40, color: Colors.borderLight },
  starFilled: { color: '#F59E0B' },
  ratingLabel: {
    textAlign: 'center', fontSize: FontSize.sm, color: Colors.textSecondary,
    marginBottom: Spacing.lg, fontWeight: FontWeight.medium,
  },
  label: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text,
    marginBottom: Spacing.xs,
  },
  textArea: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    padding: Spacing.base, fontSize: FontSize.sm, color: Colors.text,
    minHeight: 120, marginBottom: Spacing.lg,
  },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xl,
    paddingVertical: 16, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
