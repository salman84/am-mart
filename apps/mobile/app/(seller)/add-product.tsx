import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Switch, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { sellerApi, categoryApi, uploadApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

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
  const [categories, setCategories] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const pickImage = async () => {
    if (images.length >= 5) {
      Toast.show({ type: 'error', text1: 'Maximum 5 images allowed' });
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
      Toast.show({ type: 'error', text1: 'Image upload failed' });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Toast.show({ type: 'error', text1: 'Product name is required' });
      return;
    }
    if (!form.categoryId) {
      Toast.show({ type: 'error', text1: 'Please select a category' });
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      Toast.show({ type: 'error', text1: 'Enter a valid price' });
      return;
    }
    if (!form.stock || isNaN(Number(form.stock))) {
      Toast.show({ type: 'error', text1: 'Enter a valid stock quantity' });
      return;
    }

    setIsSubmitting(true);
    try {
      await sellerApi.createProduct({
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
      });
      Toast.show({ type: 'success', text1: 'Product published!', text2: `${form.name} is now live` });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to add product' });
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
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Basic Info */}
        <View style={styles.card}>
          <Field label="Product Name" required>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fresh Apples 1kg"
              placeholderTextColor={Colors.textLight}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            />
          </Field>

          <Field label="Category" required>
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

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your product..."
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
            <Field label="Price (₩)" required>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                value={form.price}
                onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Discount Price (₩)">
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor={Colors.textLight}
                value={form.discountPrice}
                onChangeText={(v) => setForm((f) => ({ ...f, discountPrice: v }))}
                keyboardType="numeric"
              />
            </Field>
          </View>

          <View style={styles.row}>
            <Field label="Stock" required>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                value={form.stock}
                onChangeText={(v) => setForm((f) => ({ ...f, stock: v }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Unit">
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
              placeholder="Optional"
              placeholderTextColor={Colors.textLight}
              value={form.sku}
              onChangeText={(v) => setForm((f) => ({ ...f, sku: v }))}
            />
          </Field>

          {/* Featured Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.fieldLabel}>Featured Product</Text>
              <Text style={styles.toggleSub}>Show this product in the featured section</Text>
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
            Product Images <Text style={styles.imageCount}>({images.length}/5)</Text>
          </Text>
          <View style={styles.imagesRow}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.imageUpload} onPress={pickImage} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={28} color={Colors.textLight} />
                    <Text style={styles.imageUploadText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.imageUploadSub}>Max 5 images, JPG/PNG, up to 5MB each</Text>
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
              <Text style={styles.submitText}>Publish Product</Text>
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
