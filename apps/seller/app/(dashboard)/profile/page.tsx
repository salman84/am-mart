'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi, uploadApi } from '../../../lib/api';
import { Store, Upload, Save, CheckCircle, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../lib/useLanguage';

function ApprovalBadge({
  status,
  approvedLabel,
  underReviewLabel,
  rejectedLabel,
}: {
  status: string;
  approvedLabel: string;
  underReviewLabel: string;
  rejectedLabel: string;
}) {
  if (status === 'APPROVED')
    return (
      <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> {approvedLabel}
      </span>
    );
  if (status === 'PENDING')
    return (
      <span className="badge bg-yellow-100 text-yellow-700 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {underReviewLabel}
      </span>
    );
  if (status === 'REJECTED')
    return (
      <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
        <XCircle className="w-3 h-3" /> {rejectedLabel}
      </span>
    );
  return <span className="badge bg-gray-100 text-gray-600">{status || 'Unknown'}</span>;
}

export default function ProfilePage() {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    contactPhone: '',
    contactEmail: '',
    logoUrl: '',
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const { data, isLoading } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: () => sellerApi.getProfile().then((r) => r.data),
  });

  useEffect(() => {
    if (initialized || !data) return;
    const seller = data?.seller || data;
    setForm({
      storeName: seller?.storeName || '',
      storeDescription: seller?.storeDescription || '',
      contactPhone: seller?.contactPhone || seller?.user?.phone || '',
      contactEmail: seller?.contactEmail || seller?.user?.email || '',
      logoUrl: seller?.logoUrl || seller?.logo || '',
    });
    setInitialized(true);
  }, [data, initialized]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => sellerApi.updateProfile(payload),
    onSuccess: () => {
      toast.success(t.success);
      qc.invalidateQueries({ queryKey: ['seller-profile'] });

      try {
        const raw = localStorage.getItem('sellerUser');
        if (raw) {
          const user = JSON.parse(raw);
          user.storeName = form.storeName;
          if (user.seller) user.seller.storeName = form.storeName;
          localStorage.setItem('sellerUser', JSON.stringify(user));
        }
      } catch {}
    },
    onError: (err: any) => toast.error(err.response?.data?.message || t.error),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await uploadApi.uploadImage(file, 'store-logos');
      const url = res.data?.url || res.data?.imageUrl || res.data;
      if (url) set('logoUrl', typeof url === 'string' ? url : url.url);
      toast.success(t.success);
    } catch {
      toast.error(t.error);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName.trim()) {
      toast.error(t.storeName);
      return;
    }
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        storeName: form.storeName.trim(),
        storeDescription: form.storeDescription.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        logoUrl: form.logoUrl,
      });
    } finally {
      setSaving(false);
    }
  };

  const seller = data?.seller || data;
  const approvalStatus = seller?.approvalStatus || seller?.status || 'PENDING';
  const commissionRate = seller?.commissionRate ?? seller?.commission ?? 0;

  if (isLoading && !initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.storeProfile}</h1>
        <p className="text-gray-500 mt-1">{t.storeSettings}</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Status & Info (read-only) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">{t.approvalStatus}</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.approvalStatus}</p>
              <ApprovalBadge
                status={approvalStatus}
                approvedLabel={t.approved}
                underReviewLabel={t.underReview}
                rejectedLabel={t.rejected}
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t.commissionRate}</p>
              <span className="text-sm font-semibold text-gray-800">{commissionRate}%</span>
            </div>
          </div>
        </div>

        {/* Store Logo */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">{t.storeLogo}</h2>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Store logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div>
              <label
                htmlFor="logo-upload"
                className={`btn-secondary flex items-center gap-2 cursor-pointer ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingLogo ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                    {t.loading}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {form.logoUrl ? t.changeLogo : t.uploadLogo}
                  </>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG, WEBP — recommended 256×256</p>
            </div>
          </div>
        </div>

        {/* Editable Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <h2 className="font-semibold text-gray-900">{t.storeSettings}</h2>

            <div>
              <label className="form-label" htmlFor="storeName">
                {t.storeName} *
              </label>
              <input
                id="storeName"
                type="text"
                className="form-input"
                placeholder={t.storeNamePlaceholder}
                value={form.storeName}
                onChange={(e) => set('storeName', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="storeDesc">
                {t.storeDescription}
              </label>
              <textarea
                id="storeDesc"
                className="form-input resize-none"
                rows={4}
                placeholder={t.storeDescriptionPlaceholder}
                value={form.storeDescription}
                onChange={(e) => set('storeDescription', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="contactPhone">
                  {t.contactPhone}
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  className="form-input"
                  placeholder={t.phonePlaceholder}
                  value={form.contactPhone}
                  onChange={(e) => set('contactPhone', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="contactEmail">
                  {t.contactEmail}
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  className="form-input"
                  placeholder={t.emailPlaceholder}
                  value={form.contactEmail}
                  onChange={(e) => set('contactEmail', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={saving || updateMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {saving || updateMutation.isPending ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t.saveChanges}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
