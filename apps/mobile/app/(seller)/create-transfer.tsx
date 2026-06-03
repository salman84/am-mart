import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sellerWarehouseApi, sellerApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

type TransferItem = { productId: string; productName: string; expectedQuantity: number };

export default function CreateTransferScreen() {
  const { t } = useLanguage();
  const [centers, setCenters] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      sellerWarehouseApi.getCenters().then(r => setCenters(r.data.centers || [])),
      sellerApi.getMyProducts({ limit: 200 }).then(r => setProducts(r.data.products || [])),
    ]).catch(() => {}).finally(() => setIsLoadingData(false));
  }, []);

  const addItem = (product: any) => {
    if (items.find(i => i.productId === product.id)) return;
    setItems(prev => [...prev, { productId: product.id, productName: product.name, expectedQuantity: 1 }]);
  };

  const updateQuantity = (productId: string, qty: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, expectedQuantity: Math.max(1, qty) } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleSubmit = async () => {
    if (!selectedCenter) {
      Toast.show({ type: 'error', text1: t('selectCategoryFirst') || 'Select a warehouse' });
      return;
    }
    if (items.length === 0) {
      Toast.show({ type: 'error', text1: 'Add at least one product' });
      return;
    }

    setIsSubmitting(true);
    try {
      await sellerWarehouseApi.createTransfer({
        destinationFulfillmentId: selectedCenter,
        originType: 'SELLER',
        notes: notes || undefined,
        items: items.map(i => ({ productId: i.productId, expectedQuantity: i.expectedQuantity })),
      });
      Toast.show({ type: 'success', text1: t('createTransfer') || 'Transfer created', text2: 'Your transfer request has been submitted' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableProducts = products.filter(p => !items.find(i => i.productId === p.id));

  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createTransfer') || 'Create Transfer'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Select Warehouse */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('selectWarehouse') || 'Select Warehouse'} *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            <View style={styles.chipRow}>
              {centers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, selectedCenter === c.id && styles.chipActive]}
                  onPress={() => setSelectedCenter(c.id)}
                >
                  <Text style={[styles.chipText, selectedCenter === c.id && styles.chipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Selected Items */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('products') || 'Products'} ({items.length})</Text>
          {items.map(item => (
            <View key={item.productId} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => updateQuantity(item.productId, item.expectedQuantity - 1)}>
                  <Ionicons name="remove-circle-outline" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.expectedQuantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.productId, item.expectedQuantity + 1)}>
                  <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeItem(item.productId)}>
                <Ionicons name="close-circle" size={22} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add product */}
          {availableProducts.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>{t('addProduct') || 'Add Product'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={styles.chipRow}>
                  {availableProducts.slice(0, 20).map(p => (
                    <TouchableOpacity key={p.id} style={styles.addChip} onPress={() => addItem(p)}>
                      <Ionicons name="add" size={14} color={Colors.primary} />
                      <Text style={styles.addChipText} numberOfLines={1}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('notes') || 'Notes'}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('optional') || 'Optional notes...'}
            placeholderTextColor={Colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>{t('submitTransfer') || 'Submit Transfer'}</Text>
            </>
          )}
        </TouchableOpacity>
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
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, gap: 10 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  itemName: { fontSize: FontSize.base, color: Colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, width: 30, textAlign: 'center' },
  addChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
    maxWidth: 160,
  },
  addChipText: { fontSize: FontSize.sm, color: Colors.primary },
  notesInput: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    fontSize: FontSize.base, color: Colors.text, minHeight: 80,
  },
  submitBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 54, borderRadius: BorderRadius['2xl'],
  },
  submitText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
