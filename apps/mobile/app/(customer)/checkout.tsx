import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { cartApi, orderApi, couponApi, userApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

const PAYMENT_METHODS = [
  { id: 'COD', label: 'Cash on Delivery', icon: 'cash-outline' },
  { id: 'WALLET', label: 'AM Mart Wallet', icon: 'wallet-outline' },
  { id: 'CARD', label: 'Credit / Debit Card', icon: 'card-outline' },
];

export default function CheckoutScreen() {
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
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

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await couponApi.validate(couponCode, subtotal);
      setCoupon(res.data);
      Toast.show({ type: 'success', text1: 'Coupon applied!', text2: res.data.description });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Invalid coupon' });
    }
  };

  const subtotal = cart?.items?.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0) || 0;
  const deliveryFee = subtotal >= freeThreshold ? 0 : deliveryFeeAmount;
  const discount = coupon?.discountType === 'PERCENTAGE'
    ? Math.min(subtotal * coupon.discountValue / 100, coupon.maxDiscountAmount || Infinity)
    : coupon?.discountValue || 0;
  const total = subtotal + deliveryFee - discount;

  const placeOrder = async () => {
    if (!selectedAddress) { Toast.show({ type: 'error', text1: 'Please select a delivery address' }); return; }
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
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to place order' });
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
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {addresses.length === 0 ? (
            <TouchableOpacity style={styles.addAddressBtn} onPress={() => router.push('/(customer)/profile')}>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
              <Text style={styles.addAddressText}>Add Address</Text>
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
                    <Text style={styles.addressLabel}>{addr.label || 'Home'}</Text>
                    <Text style={styles.addressText}>{addr.street}, {addr.city}</Text>
                    {addr.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary ({cart?.items?.length} items)</Text>
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
          <Text style={styles.sectionTitle}>Payment Method</Text>
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
          <Text style={styles.sectionTitle}>Coupon Code</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter coupon code"
              placeholderTextColor={Colors.textLight}
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.couponBtn} onPress={applyCoupon}>
              <Text style={styles.couponBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {coupon && (
            <View style={styles.couponApplied}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={styles.couponAppliedText}>Coupon applied: -{coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `${currency}${coupon.discountValue?.toLocaleString()}`}</Text>
            </View>
          )}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Note (optional)</Text>
          <TextInput
            style={[styles.couponInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            placeholder="Special instructions for your order..."
            placeholderTextColor={Colors.textLight}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* Price Summary */}
        <View style={[styles.section, styles.priceSummary]}>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>Subtotal</Text><Text style={styles.priceValue}>{currency}{subtotal.toLocaleString()}</Text></View>
          <View style={styles.priceRow}><Text style={styles.priceLabel}>Delivery Fee</Text><Text style={[styles.priceValue, deliveryFee === 0 && { color: Colors.primary }]}>{deliveryFee === 0 ? 'FREE' : `${currency}${deliveryFee.toLocaleString()}`}</Text></View>
          {discount > 0 && <View style={styles.priceRow}><Text style={[styles.priceLabel, { color: Colors.primary }]}>Discount</Text><Text style={[styles.priceValue, { color: Colors.primary }]}>-{currency}{discount.toLocaleString()}</Text></View>}
          <View style={[styles.priceRow, styles.totalRow]}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{currency}{total.toLocaleString()}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel2}>Total: <Text style={styles.totalValue2}>{currency}{total.toLocaleString()}</Text></Text>
        </View>
        <TouchableOpacity style={[styles.placeBtn, placing && { opacity: 0.7 }]} onPress={placeOrder} disabled={placing}>
          {placing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.placeBtnText}>Place Order</Text>}
        </TouchableOpacity>
      </View>
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
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: FontSize.sm, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  couponBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, justifyContent: 'center' },
  couponBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  couponAppliedText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
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
});
