import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { cartApi, orderApi, couponApi, userApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

export default function CheckoutScreen() {
  const { t } = useLanguage();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₨');

  const PAYMENT_METHODS = [
    { id: 'COD', label: t('cashOnDelivery'), icon: 'cash-outline' },
    { id: 'WALLET', label: t('wallet'), icon: 'wallet-outline' },
    { id: 'CARD', label: t('creditCard'), icon: 'card-outline' },
  ];
  const freeThreshold = useSelector((state: RootState) => (state.appSettings as any)?.freeDeliveryThreshold || 50000);
  const deliveryFeeAmount = useSelector((state: RootState) => (state.appSettings as any)?.deliveryFee || 3000);

  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<any>(null);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  // Wallet coupon picker
  const [walletCoupons, setWalletCoupons] = useState<any[]>([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      cartApi.getCart().then((r) => setCart(r.data)),
      userApi.getAddresses().then((r) => {
        const addrs = r.data.addresses || [];
        setAddresses(addrs);
        const def = addrs.find((a: any) => a.isDefault) || addrs[0];
        if (def) setSelectedAddress(def);
      }),
    ]).finally(() => setIsLoading(false));
  }, []);

  const openWalletPicker = async () => {
    setShowWalletPicker(true);
    if (walletCoupons.length === 0) {
      setWalletLoading(true);
      try {
        const res = await couponApi.getMyCoupons();
        const active = (res.data?.coupons || []).filter((c: any) => c.isValid && !c.isUsed);
        setWalletCoupons(active);
      } catch {
        // ignore
      } finally {
        setWalletLoading(false);
      }
    }
  };

  const selectWalletCoupon = async (wc: any) => {
    setShowWalletPicker(false);
    setCouponCode(wc.code);
    // Validate immediately
    try {
      const res = await couponApi.validateAuth(wc.code, subtotal);
      setCoupon(res.data);
      Toast.show({ type: 'success', text1: t('couponApplied'), text2: res.data.description || wc.title });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('invalidCoupon') });
      setCoupon(null);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await couponApi.validateAuth(couponCode, subtotal);
      setCoupon(res.data);
      Toast.show({ type: 'success', text1: t('couponApplied'), text2: res.data.description });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('invalidCoupon') });
      setCoupon(null);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponCode('');
  };

  const subtotal = cart?.items?.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0) || 0;
  const deliveryFee = subtotal >= freeThreshold ? 0 : deliveryFeeAmount;
  const discount = coupon?.discountType === 'PERCENTAGE' || coupon?.type === 'PERCENTAGE'
    ? Math.min(subtotal * (coupon.discountValue ?? coupon.value) / 100, coupon.maxDiscountAmount ?? coupon.maxDiscount ?? Infinity)
    : coupon?.discountValue ?? coupon?.value ?? 0;
  const total = subtotal + deliveryFee - discount;

  const placeOrder = async () => {
    if (!selectedAddress) { Toast.show({ type: 'error', text1: t('selectDeliveryAddress') }); return; }
    setPlacing(true);
    try {
      const res = await orderApi.create({
        addressId: selectedAddress.id,
        paymentMethod,
        couponCode: coupon ? couponCode : undefined,
        note,
      });
      router.replace({ pathname: '/(customer)/order/[id]', params: { id: res.data.order.id } });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('failedPlaceOrder') });
    } finally {
      setPlacing(false);
    }
  };

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('checkout')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('deliveryAddress')}</Text>
          {addresses.length === 0 ? (
            <TouchableOpacity style={styles.addAddressBtn} onPress={() => router.push('/(customer)/profile')}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addAddressText}>{t('addAddress')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addressList}>
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addressCard, selectedAddress?.id === addr.id && styles.addressSelected]}
                  onPress={() => setSelectedAddress(addr)}
                >
                  <View style={styles.addressRadio}>
                    {selectedAddress?.id === addr.id && <View style={styles.radioFill} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{addr.label || t('homeLabel')}</Text>
                    <Text style={styles.addressText}>{addr.street}, {addr.city}</Text>
                    {addr.isDefault && <Text style={styles.defaultBadge}>{t('defaultLabel')}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orderSummary')} ({cart?.items?.length})</Text>
          {cart?.items?.map((item: any) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.orderItemQty}>× {item.quantity}</Text>
              <Text style={styles.orderItemPrice}>{currency}{(item.product.price * item.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('paymentMethod')}</Text>
          <View style={styles.paymentList}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentCard, paymentMethod === method.id && styles.paymentSelected]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Ionicons name={method.icon as any} size={20} color={paymentMethod === method.id ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.paymentLabel, paymentMethod === method.id && { color: Colors.primary }]}>{method.label}</Text>
                {paymentMethod === method.id && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Coupon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('couponCode')}</Text>

          {/* Applied coupon banner */}
          {coupon ? (
            <View style={styles.appliedBanner}>
              <Ionicons name="pricetag" size={18} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appliedCode}>{couponCode}</Text>
                <Text style={styles.appliedSaving}>
                  {t('discount')}: -{coupon.discountType === 'PERCENTAGE' || coupon.type === 'PERCENTAGE'
                    ? `${coupon.discountValue ?? coupon.value}%`
                    : `${currency}${discount.toLocaleString()}`}
                </Text>
              </View>
              <TouchableOpacity onPress={removeCoupon}>
                <Ionicons name="close-circle" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Wallet picker button */}
              <TouchableOpacity style={styles.walletPickerBtn} onPress={openWalletPicker}>
                <Ionicons name="gift-outline" size={18} color={Colors.primary} />
                <Text style={styles.walletPickerText}>{t('chooseCoupon')}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>{t('enterManually')}</Text>
                <View style={styles.orLine} />
              </View>

              {/* Manual code input */}
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder={t('enterCoupon')}
                  placeholderTextColor={Colors.textLight}
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.couponBtn} onPress={applyCoupon}>
                  <Text style={styles.couponBtnText}>{t('apply')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('orderNote')}</Text>
          <TextInput
            style={[styles.couponInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            placeholder={t('orderNoteHint')}
            placeholderTextColor={Colors.textLight}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Price Summary */}
        <View style={[styles.section, styles.priceSummary]}>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t('subtotal')}</Text><Text style={styles.priceValue}>{currency}{subtotal.toLocaleString()}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>{t('deliveryFee')}</Text><Text style={[styles.priceValue, deliveryFee === 0 && { color: Colors.primary }]}>{deliveryFee === 0 ? t('free') : `${currency}${deliveryFee.toLocaleString()}`}</Text></View>
          {discount > 0 && <View style={styles.priceRow}><Text style={[styles.priceLabel, { color: Colors.primary }]}>{t('discount')}</Text><Text style={[styles.priceValue, { color: Colors.primary }]}>-{currency}{discount.toLocaleString()}</Text></View>}
          <View style={[styles.priceRow, styles.totalRow]}><Text style={styles.totalLabel}>{t('total')}</Text><Text style={styles.totalValue}>{currency}{total.toLocaleString()}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel2}>Total: <Text style={styles.totalValue2}>{currency}{total.toLocaleString()}</Text></Text>
        </View>
        <TouchableOpacity style={[styles.placeBtn, placing && { opacity: 0.7 }]} onPress={placeOrder} disabled={placing}>
          {placing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.placeBtnText}>{t('placeOrder')}</Text>}
        </TouchableOpacity>
      </View>

      {/* Wallet Coupon Picker Modal */}
      <Modal visible={showWalletPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('chooseCoupon')}</Text>
              <TouchableOpacity onPress={() => setShowWalletPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {walletLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : walletCoupons.length === 0 ? (
              <View style={styles.walletEmpty}>
                <Ionicons name="pricetag-outline" size={48} color={Colors.borderLight} />
                <Text style={styles.walletEmptyTitle}>{t('noCouponsYet')}</Text>
                <Text style={styles.walletEmptySub}>{t('noCouponsYetSub')}</Text>
              </View>
            ) : (
              <FlatList
                data={walletCoupons}
                keyExtractor={(item) => item.userCouponId || item.couponId}
                contentContainerStyle={{ padding: Spacing.base, gap: 10 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.walletCouponRow}
                    onPress={() => selectWalletCoupon(item)}
                  >
                    <View style={styles.walletCouponLeft}>
                      <Text style={styles.walletCouponCode}>{item.code}</Text>
                      {item.title && <Text style={styles.walletCouponTitle}>{item.title}</Text>}
                    </View>
                    <Text style={styles.walletCouponValue}>
                      {item.type === 'PERCENTAGE'
                        ? `${item.value}% OFF`
                        : `-${currency}${item.value?.toLocaleString()}`}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, paddingBottom: 100, gap: 12 },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.sm },
  addAddressBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: Spacing.xs },
  addAddressText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  addressList: { gap: 8 },
  addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border },
  addressSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  addressRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  addressLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  addressText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  defaultBadge: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, marginTop: 2 },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  orderItemName: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  orderItemQty: { fontSize: FontSize.sm, color: Colors.textSecondary, marginHorizontal: 8 },
  orderItemPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  paymentList: { gap: 8 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.sm, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border },
  paymentSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  paymentLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  // Applied coupon
  appliedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary,
  },
  appliedCode: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  appliedSaving: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2 },
  // Wallet picker
  walletPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary,
  },
  walletPickerText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  orText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: FontSize.sm, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  couponBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, justifyContent: 'center' },
  couponBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  priceSummary: { gap: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  priceValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.primary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, paddingBottom: 34 },
  totalLabel2: { fontSize: FontSize.sm, color: Colors.textSecondary },
  totalValue2: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text },
  placeBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius['2xl'] },
  placeBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 34,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  walletEmpty: { alignItems: 'center', padding: Spacing.xl, gap: 10 },
  walletEmptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  walletEmptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  walletCouponRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight,
  },
  walletCouponLeft: { flex: 1, gap: 2 },
  walletCouponCode: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: Colors.primary, fontFamily: 'monospace' },
  walletCouponTitle: { fontSize: FontSize.xs, color: Colors.textSecondary },
  walletCouponValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
});
