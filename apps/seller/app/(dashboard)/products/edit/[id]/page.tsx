'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { sellerApi, categoriesApi, uploadApi } from '../../../../../lib/api';
import { Upload, X, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

function flattenCats(list: any[], depth = 0): any[] {
  return list.flatMap((c) => [
    { ...c, _depth: depth },
    ...(c.children ? flattenCats(c.children, depth + 1) : []),
  ]);
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    discountPrice: '',
    stock: '',
    isFeatured: false,
    unit: '',
    weight: '',
    brand: '',
    countryOfOrigin: '',
    sku: '',
  });

  const set = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const { data: productsData, isLoading: loadingProduct } = useQuery({
    queryKey: ['seller-product', id],
    queryFn: () => sellerApi.getMyProducts({ productId: id }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data),
  });

  // Initialize form from product data
  useEffect(() => {
    if (initialized) return;
    const products = productsData?.products || productsData || [];
    const product = Array.isArray(products)
      ? products.find((p: any) => p.id === id)
      : productsData;
    if (!product) return;

    setForm({
      name: product.name || '',
      description: product.description || '',
      categoryId: product.category?.id || product.categoryId || '',
      price: product.price?.toString() || '',
      discountPrice: product.discountPrice?.toString() || '',
      stock: product.stock?.toString() || '',
      isFeatured: product.isFeatured || false,
      unit: product.unit || '',
      weight: product.weight || '',
      brand: product.brand || '',
      countryOfOrigin: product.countryOfOrigin || '',
      sku: product.sku || '',
    });
    const imgs = product.images?.map((img: any) => img.url || img) || [];
    if (product.imageUrl) imgs.unshift(product.imageUrl);
    setImageUrls(imgs.filter(Boolean));
    setInitialized(true);
  }, [productsData, id, initialized]);

  const rawCats: any[] = categoriesData?.categories || [];
  const flatCats = flattenCats(rawCats);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (imageUrls.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    for (let i = 0; i < files.length; i++) {
      setUploadingIdx(i);
      try {
        const res = await uploadApi.uploadImage(files[i], 'products');
        const url = res.data?.url || res.data?.imageUrl || res.data;
        if (url) setImageUrls((prev) => [...prev, typeof url === 'string' ? url : url.url]);
      } catch {
        toast.error(`Failed to upload ${files[i].name}`);
      } finally {
        setUploadingIdx(null);
      }
    }
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.categoryId) { toast.error('Please select a category'); return; }
    if (!form.price || Number(form.price) <= 0) { toast.error('Please enter a valid price'); return; }
    if (!form.stock || Number(form.stock) < 0) { toast.error('Please enter valid stock'); return; }

    setLoading(true);
    try {
      await sellerApi.updateProduct(id, {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
        stock: Number(form.stock),
        isFeatured: form.isFeatured,
        unit: form.unit.trim() || undefined,
        weight: form.weight.trim() || undefined,
        brand: form.brand.trim() || undefined,
        countryOfOrigin: form.countryOfOrigin.trim() || undefined,
        sku: form.sku.trim() || undefined,
        imageUrls,
      });
      toast.success('Product updated successfully!');
      router.push('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct && !initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/products"
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Back to products"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Update your product details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="font-semibold text-gray-900">Product Details</h2>
          <div>
            <label className="form-label" htmlFor="pname">Product Name *</label>
            <input id="pname" type="text" className="form-input" placeholder="e.g. Fuji Apples 1kg"
              value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="form-label" htmlFor="pdesc">Description</label>
            <textarea id="pdesc" className="form-input resize-none" rows={4}
              placeholder="Describe your product..." value={form.description}
              onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="form-label" htmlFor="pcat">Category *</label>
            <select id="pcat" className="form-input" value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)} required>
              <option value="">Select a category...</option>
              {flatCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {'  '.repeat(c._depth)}{c._depth > 0 ? '└ ' : ''}{c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Information (seller-editable details shown on product page) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">Product Information</h2>
            <p className="text-xs text-gray-400 mt-0.5">These details appear on the product page for customers</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="pbrand">Brand</label>
              <input id="pbrand" type="text" className="form-input" placeholder="e.g. Samsung, Nike"
                value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="porigin">Country of Origin</label>
              <input id="porigin" type="text" className="form-input" placeholder="e.g. Korea, USA"
                value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="pweight">Weight / Size</label>
              <input id="pweight" type="text" className="form-input" placeholder="e.g. 500g, 1kg, 2L"
                value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="punit">Unit</label>
              <input id="punit" type="text" className="form-input" placeholder="e.g. pc, kg, L, box"
                value={form.unit} onChange={(e) => set('unit', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="psku">SKU / Barcode</label>
            <input id="psku" type="text" className="form-input" placeholder="e.g. ABC-12345 (optional)"
              value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="font-semibold text-gray-900">Pricing & Stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="pprice">Price (₩) *</label>
              <input id="pprice" type="number" min="0" step="1" className="form-input" placeholder="0"
                value={form.price} onChange={(e) => set('price', e.target.value)} required />
            </div>
            <div>
              <label className="form-label" htmlFor="pdiscount">Discount Price (₩)</label>
              <input id="pdiscount" type="number" min="0" step="1" className="form-input" placeholder="Optional"
                value={form.discountPrice} onChange={(e) => set('discountPrice', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="pstock">Stock *</label>
              <input id="pstock" type="number" min="0" step="1" className="form-input" placeholder="0"
                value={form.stock} onChange={(e) => set('stock', e.target.value)} required />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only peer" checked={form.isFeatured}
                    onChange={(e) => set('isFeatured', e.target.checked)} />
                  <div className="w-10 h-6 bg-gray-200 peer-checked:bg-primary rounded-full transition-colors" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">Mark as Featured</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Product Images</h2>
            <span className="text-xs text-gray-400">{imageUrls.length}/5 images</span>
          </div>
          {imageUrls.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                  <img src={url} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageUrls.length < 5 && (
            <label htmlFor="image-upload"
              className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                uploadingIdx !== null ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary hover:bg-primary/5'
              }`}>
              {uploadingIdx !== null ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  <span className="text-xs text-primary font-medium">Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Click to upload images</span>
                </div>
              )}
              <input id="image-upload" type="file" accept="image/*" multiple className="hidden"
                onChange={handleImageUpload} disabled={uploadingIdx !== null} />
            </label>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/products" className="btn-secondary flex-1 text-center">Cancel</Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? (
              <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Saving...</>
            ) : (
              <><Save className="w-4 h-4" />Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
