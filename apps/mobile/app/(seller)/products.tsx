import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { sellerApi, productApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

export default function SellerProductsScreen() {
  const currency = useSelector((state: any) => state.appSettings?.currencySymbol ?? '₩');
  const { t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const res = await sellerApi.getMyProducts({ page: 1, limit: 50 });
      setProducts(res.data.products || []);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, []);

  const toggleActive = async (product: any) => {
    const currentlyActive = product.status === 'ACTIVE';
    const newVisible = !currentlyActive;
    try {
      await productApi.setVisibility(product.id, newVisible);
      setProducts((prev) =>
        prev.map((p) => p.id === product.id
          ? { ...p, status: newVisible ? 'ACTIVE' : 'INACTIVE' }
          : p)
      );
      Toast.show({
        type: 'success',
        text1: newVisible ? t('productVisible') : t('productHidden'),
      });
    } catch {
      Toast.show({ type: 'error', text1: t('failedUpdate') });
    }
  };

  const deleteProduct = (product: any) => {
    Alert.alert(t('deleteProductTitle'), t('deleteProductConfirm').replace('{name}', product.name), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: async () => {
          try {
            await sellerApi.deleteProduct(product.id);
            setProducts((prev) => prev.filter((p) => p.id !== product.id));
            Toast.show({ type: 'success', text1: t('productDeleted') });
          } catch {
            Toast.show({ type: 'error', text1: t('failedDelete') });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('myProductsCount').replace('{count}', String(products.length))}</Text>
        <TouchableOpacity onPress={() => router.push('/(seller)/add-product')}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={56} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>{t('noProductsYet')}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(seller)/add-product')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>{t('addFirstProduct')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productImage}>
                {item.images?.[0]?.url ? (
                  <Image source={{ uri: item.images[0].url }} style={styles.productImageImg} resizeMode="cover" />
                ) : (
                  <Ionicons name="cube-outline" size={28} color={Colors.textSecondary} />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productCat}>{item.category?.name}</Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productPrice}>{currency}{item.price?.toLocaleString()}</Text>
                  <Text style={[styles.stockText, item.stock < 5 && { color: Colors.danger }]}>
                    {t('inStockLabel').replace('{count}', String(item.stock))}
                  </Text>
                </View>
              </View>
              <View style={styles.productActions}>
                {/* Edit icon: tap to edit product */}
                <TouchableOpacity onPress={() => router.push({ pathname: '/(seller)/add-product', params: { productId: item.id } })}>
                  <Ionicons name="create-outline" size={20} color={Colors.secondary} />
                </TouchableOpacity>
                {/* Eye icon: tap to toggle hide/show */}
                <TouchableOpacity onPress={() => toggleActive(item)}>
                  <Ionicons
                    name={item.status === 'ACTIVE' ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={item.status === 'ACTIVE' ? Colors.primary : Colors.textLight}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(item)}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius['2xl'] },
  addBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  list: { padding: Spacing.base },
  productCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', ...Shadow.sm },
  productImage: { width: 64, height: 64, borderRadius: BorderRadius.md, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm, overflow: 'hidden' },
  productImageImg: { width: 64, height: 64 },
  productInfo: { flex: 1 },
  productName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  productCat: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  productPrice: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  stockText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  productActions: { alignItems: 'center', gap: 8 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  deleteBtn: { padding: 4 },
});
