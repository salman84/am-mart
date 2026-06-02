import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector } from 'react-redux';
import { sellerApi, categoryApi, uploadApi, productApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

type FieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
};

function Field({ label, required, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: Colors.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function AddProductScreen() {
  const currency = useSelector((state: any) => state.appSettings?.currencySymbol ?? '₩');
  const { t } = useLanguage();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const isEditMode = !!productId;
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(!!productId);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    stock: '',
    unit: '',
    sku: '',
    categoryId: '',
    isFeatured: false,
  });

  useEffect(() => {
    categoryApi.getAll().then((res) => setCategories(res.data.categories || [])).catch(() => {});
  }, []);

  // Load existing product data when editing
  useEffect(() => {
    if (!productId) return;
    setIsLoadingProduct(true);
    productApi.getOne(productId)
      .then((res) => {
        const p = res.data.product || res.data;
        setForm({
          name: p.name || '',
          description: p.description || '',
          price: p.price != null ? String(p.price) : '',
          discountPrice: p.discountPrice != null ? String(p.discountPrice) : '',
          stock: p.stock != null ? String(p.stock) : '',
          unit: p.unit || '',
          sku: p.sku || '',
          categoryId: p.categoryId || p.category?.id || '',
          isFeatured: !!p.isFeatured,
        });
        const existingImages = (p.images || []).map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);
        setImages(existingImages);
      })
      .catch(() => {
        Toast.show({ type: 'error', text1: t('failedLoadProduct') });
      })
      .finally(() => setIsLoadingProduct(false));
  }, [productId]);

  const MAX_IMAGES = 20;

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Toast.show({ type: 'error', text1: `Maximum ${MAX_IMAGES} images allowed` });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'photo.jpg',
      } as any);
      const res = await uploadApi.uploadImage(fd);
      const url: string = res.data.url || res.data.imageUrl || res.data.path;
      setImages((prev) => [...prev, url]);
    } catch {
      Toast.show({ type: 'error', text1: t('imageUploadFailed') });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: t('productNameRequired') });
      return;
    }
    if (!form.categoryId) {
      Toast.show({ type: 'error', text1: t('selectCategoryFirst') });
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      Toast.show({ type: 'error', text1: t('enterValidPrice') });
      return;
    }
    if (!form.stock || isNaN(Number(form.stock))) {
      Toast.show({ type: 'error', text1: t('enterValidStock') });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
      stock: Number(form.stock),
      unit: form.unit.trim() || undefined,
      sku: form.sku.trim() || undefined,
      isFeatured: form.isFeatured,
      images,
    };
    try {
      if (isEditMode) {
        await sellerApi.updateProduct(productId!, payload);
        Toast.show({
          type: 'success',
          text1: t('productUpdated'),
          text2: t('productUpdateSuccess').replace('{name}', form.name),
        });
      } else {
        await sellerApi.createProduct(payload);
        Toast.show({
          type: 'success',
          text1: t('productPublished'),
          text2: t('productNowLive').replace('{name}', form.name),
        });
      }
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || (isEditMode ? t('failedUpdateProduct') : t('failedAddProduct')) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? t('editProductTitle') : t('addProductTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoadingProduct ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Basic Info */}
        <View style={styles.card}>
          <Field label={t('productNameLabel')} required>
            <TextInput
              style={styles.input}
              placeholder={t('productNamePlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            />
          </Field>

          <Field label={t('categoryLabel')} required>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              <View style={styles.categoryRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, form.categoryId === cat.id && styles.categoryChipActive]}
                    onPress={() => setForm((f) => ({ ...f, categoryId: cat.id }))}
                  >
                    <Text style={[styles.categoryChipText, form.categoryId === cat.id && styles.categoryChipTextActive]}>
                      {cat.emoji} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Field>

          <Field label={t('description')}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('productDescPlaceholder')}
              placeholderTextColor={Colors.textLight}
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>
        </View>

        {/* Pricing & Stock */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Field label={`${t('price')} (${currency})`} required>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label={`${t('discountPrice')} (${currency})`}>
              <TextInput
                style={styles.input}
                placeholder={t('optional') || 'Optional'}
                placeholderTextColor={Colors.textLight}
                value={form.discountPrice}
                onChangeText={(v) => setForm((f) => ({ ...f, discountPrice: v }))}
                keyboardType="numeric"
              />
            </Field>
          </View>

          <View style={styles.row}>
            <Field label={t('stockLabel')} required>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                value={form.stock}
                onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label={t('unitLabel')}>
              <TextInput
                style={styles.input}
                placeholder="e.g. kg, pcs"
                placeholderTextColor={Colors.textLight}
                value={form.unit}
                onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
              />
            </Field>
          </View>

          <Field label="SKU">
            <TextInput
              style={styles.input}
              placeholder={t('optional') || 'Optional'}
              placeholderTextColor={Colors.textLight}
              value={form.sku}
              onChangeText={(v) => setForm((f) => ({ ...f, sku: v }))}
            />
          </Field>

          {/* Featured Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.fieldLabel}>{t('featuredProductLabel')}</Text>
              <Text style={styles.toggleSub}>{t('featuredProductDesc')}</Text>
            </View>
            <Switch
              value={form.isFeatured}
              onValueChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Image Upload */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {t('productImagesLabel')} <Text style={styles.imageCount}>({images.length}/{MAX_IMAGES})</Text>
          </Text>
          <View style={styles.imagesRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                {index === 0 && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeTxt}>Main</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.imageUpload} onPress={pickImage} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={28} color={Colors.textLight} />
                    <Text style={styles.imageUploadText}>{t('addPhoto') || 'Add Photo'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.imageUploadSub}>JPG/PNG up to 5MB each · First image = main display photo</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitText}>{isEditMode ? t('updateProduct') : t('publishProduct')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.base, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, gap: 14, ...Shadow.sm },
  field: { gap: 4 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  input: {
    backgroundColor: Colors.background, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 12,
    fontSize: FontSize.base, color: Colors.text,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  categoryChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  categoryChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  categoryChipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  categoryChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  toggleSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  imageThumb: { width: 80, height: 80, borderRadius: BorderRadius.md, position: 'relative' },
  thumbImg: { width: 80, height: 80, borderRadius: BorderRadius.md },
  removeImg: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 },
  mainBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(16,185,129,0.85)', borderBottomLeftRadius: BorderRadius.md, borderBottomRightRadius: BorderRadius.md, paddingVertical: 2, alignItems: 'center' },
  mainBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },
  imageUpload: {
    width: 80, height: 80, borderWidth: 2, borderColor: Colors.border,
    borderStyle: 'dashed', borderRadius: BorderRadius.md,
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  imageUploadText: { fontSize: FontSize.xs, color: Colors.textLight },
  imageUploadSub: { fontSize: FontSize.xs, color: Colors.textLight },
  imageCount: { color: Colors.textSecondary, fontWeight: FontWeight.regular },
  submitBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, backgroundColor: Colors.primary, height: 54, borderRadius: BorderRadius['2xl'],
  },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
