import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../src/store';
import { orderApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import { useLanguage } from '../../../src/i18n';

const STATUS_COLORS: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.info,
  PREPARING: Colors.secondary,
  PICKED_UP: Colors.secondary,
  OUT_FOR_DELIVERY: Colors.topup,
  DELIVERED: Colors.primary,
  CANCELLED: Colors.danger,
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₨');
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build STATUS_STEPS using translated labels
  const STATUS_STEPS = [
    { key: 'PENDING',           label: t('orderPlaced'),    icon: 'time-outline' },
    { key: 'CONFIRMED',         label: t('statusConfirmed'), icon: 'checkmark-circle-outline' },
    { key: 'PREPARING',         label: t('statusPreparing'), icon: 'restaurant-outline' },
    { key: 'PICKED_UP',         label: t('statusPickedUp'),  icon: 'bicycle-outline' },
    { key: 'OUT_FOR_DELIVERY',  label: t('statusOnTheWay'),  icon: 'navigate-outline' },
    { key: 'DELIVERED',         label: t('statusDelivered'), icon: 'checkmark-done-circle-outline' },
  ];

  useEffect(() => {
    orderApi.getOne(id).then((res) => setOrder(res.data.order)).finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!order) return <View style={styles.loading}><Text style={{ color: Colors.textSecondary }}>{t('orderNotFound')}</Text></View>;

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: `${STATUS_COLORS[order.status] || Colors.primary}15` }]}>
          <Ionicons name={STATUS_STEPS[currentStepIndex]?.icon as any || 'ellipse-outline'} size={28} color={STATUS_COLORS[order.status] || Colors.primary} />
          <View>
            <Text style={[styles.statusLabel, { color: STATUS_COLORS[order.status] || Colors.primary }]}>
              {isCancelled ? t('orderCancelled') : STATUS_STEPS[currentStepIndex]?.label || order.status}
            </Text>
            <Text style={styles.statusDate}>{new Date(order.updatedAt || order.createdAt).toLocaleString()}</Text>
          </View>
        </View>

        {/* Timeline */}
        {!isCancelled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('orderProgress')}</Text>
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, index) => {
                const isDone = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, isDone && styles.timelineDotDone, isCurrent && styles.timelineDotCurrent]}>
                        {isDone && <Ionicons name={isCurrent ? step.icon as any : 'checkmark'} size={12} color="#fff" />}
                      </View>
                      {index < STATUS_STEPS.length - 1 && (
                        <View style={[styles.timelineLine, isDone && index < currentStepIndex && styles.timelineLineDone]} />
                      )}
                    </View>
                    <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('deliveryAddress')}</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
            <Text style={styles.addressText}>
              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}
              {order.deliveryAddress?.postalCode ? ` ${order.deliveryAddress.postalCode}` : ''}
            </Text>
          </View>
        </View>

        {/* Rider Info */}
        {order.deliveryAssignment?.rider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('yourRider')}</Text>
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>{order.deliveryAssignment.rider.user?.fullName?.[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.riderName}>{order.deliveryAssignment.rider.user?.fullName}</Text>
                <Text style={styles.riderPhone}>{order.deliveryAssignment.rider.user?.phone}</Text>
              </View>
              <TouchableOpacity style={styles.callBtn}>
                <Ionicons name="call-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orderItems')}</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemIcon}>
                <Ionicons name="cube-outline" size={20} color={Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemQty}>× {item.quantity} @ {currency}{item.price?.toLocaleString()}</Text>
              </View>
              <Text style={styles.itemTotal}>{currency}{(item.price * item.quantity)?.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Leave a Review */}
        {order.status === 'DELIVERED' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('rateYourOrder')}</Text>
            {order.items?.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.reviewBtn}
                onPress={() => router.push(`/(customer)/order/review?orderId=${order.id}&productId=${item.productId}&productName=${encodeURIComponent(item.product?.name || 'Product')}`)}
              >
                <Text style={styles.reviewBtnText}>★ {t('rateProductTitle').replace('{name}', item.product?.name || 'Product')}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('paymentSummary')}</Text>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t('subtotal')}</Text><Text style={styles.priceValue}>{currency}{order.subtotal?.toLocaleString()}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t('deliveryFee')}</Text><Text style={styles.priceValue}>{order.deliveryFee === 0 ? t('free') : `${currency}${order.deliveryFee?.toLocaleString()}`}</Text></View>
          {order.discount > 0 && <View style={styles.priceRow}><Text style={[styles.priceLabel, { color: Colors.primary }]}>{t('discount')}</Text><Text style={[styles.priceValue, { color: Colors.primary }]}>-{currency}{order.discount?.toLocaleString()}</Text></View>}
          <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8, marginTop: 4 }]}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>{currency}{order.total?.toLocaleString()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('paymentMethod')}</Text>
            <Text style={styles.priceValue}>{order.paymentMethod}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderRadius: BorderRadius.xl },
  statusLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statusDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  timeline: { gap: 0 },
  timelineStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  timelineDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timelineDotCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timelineLine: { width: 2, height: 28, backgroundColor: Colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: Colors.primary },
  timelineLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, paddingTop: 4, paddingBottom: 24 },
  timelineLabelDone: { color: Colors.text, fontWeight: FontWeight.semibold },
  addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  riderCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riderAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  riderAvatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary },
  riderName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  riderPhone: { fontSize: FontSize.sm, color: Colors.textSecondary },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.xs },
  itemIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  itemQty: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  reviewBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#F0FDF4', marginBottom: 8 },
  reviewBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priceValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  totalLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.primary },
});
