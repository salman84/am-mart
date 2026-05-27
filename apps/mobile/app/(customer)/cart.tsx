import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, updateCartItem, clearCart } from '../../src/store/slices/cartSlice';
import { AppDispatch, RootState } from '../../src/store';
import { AppSettings } from '../../src/store/slices/appSettingsSlice';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

export default function CartScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, subtotal, isLoading } = useSelector((state: RootState) => state.cart);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const appSettings = useSelector((state: RootState) => state.appSettings as AppSettings);
  const { t } = useLanguage();

  const currency = appSettings.currencySymbol || '₩';
  const freeThreshold = appSettings.freeDeliveryThreshold || 50000;
  const deliveryFeeAmount = appSettings.deliveryFee || 3000;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchCart());
  }, [isAuthenticated]);

  useEffect(() => {
    setSelected(new Set(items.map((i: any) => i.id)));
  }, [items.length]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i: any) => i.id)));
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    Alert.alert('Delete Items', `Remove ${selected.size} item(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          selected.forEach((id) => dispatch(updateCartItem({ itemId: id, quantity: 0 })));
          setSelected(new Set());
        },
      },
    ]);
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    if (newQty < 0) return;
    dispatch(updateCartItem({ itemId, quantity: newQty }));
  };

  const selectedItems = items.filter((i: any) => selected.has(i.id));
  const selectedSubtotal = selectedItems.reduce((sum: number, i: any) => {
    const price = i.product.discountPrice || i.product.price;
    return sum + price * i.quantity;
  }, 0);

  const deliveryFee = selectedSubtotal >= freeThreshold ? 0 : deliveryFeeAmount;
  const total = selectedSubtotal + deliveryFee;

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('myCart')}</Text>
        </View>
        <View style={styles.emptyCart}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="cart-outline" size={56} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items to get started</Text>
          <TouchableOpacity style={styles.shopButton} onPress={() => router.push('/(customer)/products')}>
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: any }) => {
    const price = item.product.discountPrice || item.product.price;
    const image = item.product.images?.[0]?.url;
    const discountPct = item.product.discountPrice
      ? Math.round((1 - item.product.discountPrice / item.product.price) * 100)
      : 0;
    const isChecked = selected.has(item.id);

    return (
      <View style={[styles.cartItem, !isChecked && styles.cartItemDimmed]}>
        <TouchableOpacity onPress={() => toggleSelect(item.id)} style={styles.checkbox}>
          <View style={[styles.checkboxBox, isChecked && styles.checkboxChecked]}>
            {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <View style={styles.productImageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={22} color={Colors.textLight} />
            </View>
          )}
          {discountPct > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
          <Text style={styles.itemStore}>{item.product.seller?.storeName}</Text>
          <View style={styles.itemPriceRow}>
            {item.product.discountPrice && (
              <Text style={styles.originalPrice}>{currency}{item.product.price.toLocaleString()}</Text>
            )}
            <Text style={styles.itemPrice}>{currency}{price.toLocaleString()}</Text>
          </View>
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => handleQuantityChange(item.id, item.quantity - 1)}
            >
              <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={15}
                color={item.quantity === 1 ? Colors.danger : Colors.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => handleQuantityChange(item.id, item.quantity + 1)}
            >
              <Ionicons name="add" size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart ({items.length})</Text>
      </View>

      {/* Select All Bar */}
      <View style={styles.selectBar}>
        <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll}>
          <View style={[styles.checkboxBox, selected.size === items.length && styles.checkboxChecked]}>
            {selected.size === items.length && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.selectAllText}>
            All ({selected.size}/{items.length})
          </Text>
        </TouchableOpacity>
        {selected.size > 0 && (
          <TouchableOpacity onPress={handleDeleteSelected} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete ({selected.size})</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Order Summary */}
      <View style={styles.summary}>
        {selectedSubtotal < 50000 && selectedSubtotal > 0 && (
          <View style={styles.freeDeliveryBar}>
            <Ionicons name="bicycle-outline" size={14} color={Colors.primary} />
            <Text style={styles.freeDeliveryHint}>
              Add {currency}{(freeThreshold - selectedSubtotal).toLocaleString()} more for free delivery
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Selected items subtotal</Text>
          <Text style={styles.summaryValue}>{currency}{selectedSubtotal.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          {deliveryFee === 0 ? (
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>FREE</Text>
          ) : (
            <Text style={styles.summaryValue}>{currency}{deliveryFee.toLocaleString()}</Text>
          )}
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{currency}{total.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutButton, selected.size === 0 && styles.checkoutDisabled]}
          disabled={selected.size === 0}
          onPress={() => {
            if (!isAuthenticated) {
              router.push({ pathname: '/(auth)/welcome', params: { returnTo: 'cart' } });
              return;
            }
            router.push('/(customer)/checkout');
          }}
        >
          <Text style={styles.checkoutText}>
            {selected.size === 0 ? 'Select items to checkout' : `Order (${selected.size} items)`}
          </Text>
          {selected.size > 0 && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  selectBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectAllText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.text },
  checkboxBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtnText: { fontSize: FontSize.sm, color: Colors.danger, fontWeight: FontWeight.medium },
  listContent: { padding: Spacing.sm, paddingBottom: 8 },
  separator: { height: 8 },
  cartItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.base, gap: Spacing.sm,
  },
  cartItemDimmed: { opacity: 0.5 },
  checkbox: { paddingTop: 2, paddingRight: 2 },
  productImageContainer: {
    width: 80, height: 80, borderRadius: BorderRadius.md,
    overflow: 'hidden', backgroundColor: Colors.surfaceVariant,
  },
  productImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  discountBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(220,38,38,0.85)', paddingVertical: 2, alignItems: 'center',
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: FontWeight.bold },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, lineHeight: 18 },
  itemStore: { fontSize: 11, color: Colors.textSecondary },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  originalPrice: { fontSize: FontSize.xs, color: Colors.textLight, textDecorationLine: 'line-through' },
  itemPrice: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: Colors.primary },
  quantityControl: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', marginTop: 4,
  },
  qtyButton: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, minWidth: 20, textAlign: 'center' },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, gap: 12 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle: { fontSize: FontSize.base, color: Colors.textSecondary },
  shopButton: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
    borderRadius: BorderRadius['2xl'],
  },
  shopButtonText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  summary: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
    gap: 8,
  },
  freeDeliveryBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    paddingVertical: 7, paddingHorizontal: 12, marginBottom: 4,
  },
  freeDeliveryHint: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  totalRow: { paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 2 },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.primary },
  checkoutButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius['2xl'],
    marginTop: 4,
  },
  checkoutDisabled: { backgroundColor: Colors.textLight },
  checkoutText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
