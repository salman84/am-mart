import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../../src/store';
import { productApi, cartApi, reviewsApi } from '../../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../../src/theme';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    productApi.getOne(id).then((res) => setProduct(res.data)).finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    reviewsApi.getProductReviews(id).then((res) => {
      const data = res.data;
      setReviews(Array.isArray(data) ? data : (data?.reviews || []));
    }).catch(() => setReviews([]));
  }, [id]);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await cartApi.addItem({ productId: id, quantity });
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: `${product.name} × ${quantity}` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to add' });
    } finally {
      setAddingToCart(false);
    }
  };

  if (isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!product) return <View style={styles.loading}><Text style={{ color: Colors.textSecondary }}>Product not found</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(customer)/cart')} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cube-outline" size={80} color={Colors.textLight} />
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.badges}>
            {product.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{product.category.name}</Text>
              </View>
            )}
            {product.stock < 10 && product.stock > 0 && (
              <View style={[styles.categoryBadge, { backgroundColor: Colors.warningLight }]}>
                <Text style={[styles.categoryText, { color: Colors.warning }]}>Low Stock</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          {product.seller && (
            <View style={styles.sellerRow}>
              <Ionicons name="storefront-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.sellerText}>{product.seller.storeName}</Text>
            </View>
          )}

          <Text style={styles.price}>{currency}{product.price?.toLocaleString()}</Text>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Reviews</Text>
            {reviews.length > 0 ? (
              <>
                {/* Average Rating */}
                <View style={styles.avgRatingRow}>
                  <Text style={styles.avgRatingNumber}>
                    {(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)}
                  </Text>
                  <View style={styles.avgStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
                      return (
                        <Text key={star} style={[styles.reviewStar, star <= Math.round(avg) && styles.reviewStarFilled]}>
                          {star <= Math.round(avg) ? '★' : '☆'}
                        </Text>
                      );
                    })}
                  </View>
                  <Text style={styles.reviewCount}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</Text>
                </View>

                {/* Review List (up to 5) */}
                {reviews.slice(0, 5).map((review: any, index: number) => {
                  const firstName = review.customer?.fullName?.split(' ')[0] || review.user?.fullName?.split(' ')[0] || 'Customer';
                  const dateStr = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '';
                  return (
                    <View key={review.id || index} style={styles.reviewItem}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerAvatar}>
                          <Text style={styles.reviewerAvatarText}>{firstName[0]?.toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewerName}>{firstName}</Text>
                          <View style={styles.reviewStarsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={[styles.reviewStar, star <= review.rating && styles.reviewStarFilled]}>
                                {star <= review.rating ? '★' : '☆'}
                              </Text>
                            ))}
                          </View>
                        </View>
                        {dateStr ? <Text style={styles.reviewDate}>{dateStr}</Text> : null}
                      </View>
                      {review.comment ? (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.noReviews}>
                <Ionicons name="star-outline" size={32} color={Colors.textLight} />
                <Text style={styles.noReviewsText}>Be the first to review this product!</Text>
              </View>
            )}
          </View>

          {product.unit && (
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Unit</Text>
              <Text style={styles.specValue}>{product.unit}</Text>
            </View>
          )}
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Stock</Text>
            <Text style={[styles.specValue, { color: product.stock > 0 ? Colors.primary : Colors.danger }]}>
              {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
            </Text>
          </View>

          {/* Quantity */}
          <View style={styles.quantityRow}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={18} color={quantity <= 1 ? Colors.textLight : Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity >= product.stock && styles.qtyBtnDisabled]}
                onPress={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
              >
                <Ionicons name="add" size={18} color={quantity >= product.stock ? Colors.textLight : Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>{currency}{(product.price * quantity).toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, (product.stock === 0 || addingToCart) && styles.disabled]}
          onPress={handleAddToCart}
          disabled={product.stock === 0 || addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={styles.addToCartText}>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn: { padding: 4 },
  cartBtn: { padding: 4 },
  content: { paddingBottom: 100 },
  imageContainer: { backgroundColor: Colors.surface, height: 280, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoContainer: { padding: Spacing.lg },
  badges: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full },
  categoryText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  productName: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, lineHeight: 30, marginBottom: Spacing.xs },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  sellerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  price: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.primary, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.base },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.xs },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  specLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  specValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  qtyBtnDisabled: { borderColor: Colors.borderLight },
  qtyValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, minWidth: 32, textAlign: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, paddingBottom: 34 },
  totalLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  totalPrice: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.text },
  addToCartBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius['2xl'] },
  disabled: { opacity: 0.6 },
  addToCartText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  avgRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.base },
  avgRatingNumber: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.text },
  avgStarsRow: { flexDirection: 'row', gap: 2 },
  reviewCount: { fontSize: FontSize.sm, color: Colors.textSecondary },
  reviewItem: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  reviewerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  reviewerAvatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  reviewerName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  reviewStarsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  reviewStar: { fontSize: 14, color: Colors.borderLight },
  reviewStarFilled: { color: '#F59E0B' },
  reviewDate: { fontSize: FontSize.xs, color: Colors.textLight },
  reviewComment: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginLeft: 42 },
  noReviews: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  noReviewsText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
});
