'use client';

import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, uploadApi, notificationsApi } from '../../../lib/api';
import { Settings, Bell, Send, Upload, Image, X, ToggleLeft, Layout, Smartphone, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

type SettingsTab = 'general' | 'landing';

// Keys that use image upload
const LOGO_FIELDS = [
  {
    key: 'APP_LOGO',
    label: 'Header Logo',
    description: 'Shown in the app top navigation bar. Transparent PNG recommended.',
    folder: 'logos',
  },
  {
    key: 'APP_ICON_LOGO',
    label: 'App Icon Logo',
    description: 'Reference image for the app launcher icon. Used in next build.',
    folder: 'logos',
  },
  {
    key: 'SPLASH_LOGO',
    label: 'Splash Screen Logo',
    description: 'Logo displayed on the app loading / splash screen.',
    folder: 'logos',
  },
];

const TEXT_SETTINGS = [
  { label: 'App Name', key: 'APP_NAME' },
  { label: 'App Tagline (shown below logo)', key: 'APP_TAGLINE' },
  { label: 'Currency Symbol (e.g. ₩, $, €)', key: 'CURRENCY_SYMBOL' },
  { label: 'App Currency Code (e.g. KRW, USD)', key: 'CURRENCY' },
  { label: 'Delivery Fee', key: 'DELIVERY_FEE' },
  { label: 'Free Delivery Threshold', key: 'FREE_DELIVERY_THRESHOLD' },
  { label: 'Popular Search Terms (comma-separated)', key: 'APP_POPULAR_SEARCHES' },
  { label: 'Default Commission Rate (%)', key: 'DEFAULT_COMMISSION_RATE' },
  { label: 'SIM Reservation Timeout (minutes)', key: 'SIM_RESERVATION_TIMEOUT' },
  { label: 'Support Email', key: 'SUPPORT_EMAIL' },
  { label: 'Support Phone', key: 'SUPPORT_PHONE' },
  { label: 'Minimum App Version', key: 'APP_MIN_VERSION' },
  { label: 'Kakao REST API Key (for Korean address search)', key: 'KAKAO_REST_API_KEY' },
];

const FEATURE_FLAGS = [
  { key: 'FEATURE_TOPUP', label: 'Mobile Top-Up', description: 'Show/hide the top-up feature in the app' },
  { key: 'FEATURE_SIM', label: 'SIM Card Sales', description: 'Show/hide SIM card browsing and purchase' },
  { key: 'FEATURE_WALLET', label: 'Wallet System', description: 'Enable/disable customer wallet' },
  { key: 'FEATURE_REVIEWS', label: 'Product Reviews', description: 'Allow customers to leave reviews' },
  { key: 'FEATURE_DELIVERY_TRACKING', label: 'Live Delivery Tracking', description: 'Show delivery tracking map' },
  { key: 'FEATURE_ADDRESS_SEARCH', label: 'Korean Address Search (도로명주소)', description: 'Enable Kakao/Daum postcode address search for Korea — disable if selling outside Korea' },
];

const LANDING_SECTIONS = [
  {
    group: 'Hero Section',
    fields: [
      { key: 'LP_HERO_TITLE', label: 'Hero Title (line 1)', placeholder: 'Sell to Korea with' },
      { key: 'LP_HERO_TITLE_BRAND', label: 'Hero Title (brand name, highlighted)', placeholder: 'Your Brand' },
      { key: 'LP_HERO_SUBTITLE', label: 'Hero Subtitle / Description', placeholder: 'Reach millions of customers...', textarea: true },
      { key: 'LP_HERO_CTA_PRIMARY', label: 'Primary CTA Button Text', placeholder: 'Start Selling Free' },
      { key: 'LP_HERO_CTA_SECONDARY', label: 'Secondary CTA Button Text', placeholder: 'Sign In' },
    ],
  },
  {
    group: 'Stats Bar',
    fields: [
      { key: 'LP_STATS_SELLERS', label: 'Active Sellers Value', placeholder: '10,000+' },
      { key: 'LP_STATS_PRODUCTS', label: 'Products Listed Value', placeholder: '500K+' },
      { key: 'LP_STATS_CUSTOMERS', label: 'Customers Value', placeholder: '2M+' },
      { key: 'LP_STATS_DELIVERIES', label: 'Deliveries Value', placeholder: '5M+' },
    ],
  },
  {
    group: '"Why Sell" Section',
    fields: [
      { key: 'LP_WHY_TITLE', label: 'Section Title', placeholder: 'Why Sell With Us?' },
      { key: 'LP_WHY_SUBTITLE', label: 'Section Subtitle', placeholder: 'Join thousands of sellers...' },
      { key: 'LP_FEATURE_1_TITLE', label: 'Feature 1 Title', placeholder: 'We Support Our Sellers' },
      { key: 'LP_FEATURE_1_DESC', label: 'Feature 1 Description', placeholder: '...', textarea: true },
      { key: 'LP_FEATURE_2_TITLE', label: 'Feature 2 Title', placeholder: 'We Think Global' },
      { key: 'LP_FEATURE_2_DESC', label: 'Feature 2 Description', placeholder: '...', textarea: true },
      { key: 'LP_FEATURE_3_TITLE', label: 'Feature 3 Title', placeholder: 'Seamless Integration' },
      { key: 'LP_FEATURE_3_DESC', label: 'Feature 3 Description', placeholder: '...', textarea: true },
    ],
  },
  {
    group: '"Why Korea" Section',
    fields: [
      { key: 'LP_MARKET_TITLE', label: 'Section Title', placeholder: 'Why Sell in Korea?' },
      { key: 'LP_MARKET_SUBTITLE', label: 'Section Subtitle', placeholder: 'Korea is one of the hottest e-commerce markets...', textarea: true },
      { key: 'LP_MARKET_1_TITLE', label: 'Point 1 Title', placeholder: 'Ultra Wired' },
      { key: 'LP_MARKET_1_DESC', label: 'Point 1 Description', placeholder: '...', textarea: true },
      { key: 'LP_MARKET_2_TITLE', label: 'Point 2 Title', placeholder: 'Population Density' },
      { key: 'LP_MARKET_2_DESC', label: 'Point 2 Description', placeholder: '...', textarea: true },
      { key: 'LP_MARKET_3_TITLE', label: 'Point 3 Title', placeholder: 'High Spenders' },
      { key: 'LP_MARKET_3_DESC', label: 'Point 3 Description', placeholder: '...', textarea: true },
    ],
  },
  {
    group: 'Testimonials',
    fields: [
      { key: 'LP_TESTIMONIAL_1_QUOTE', label: 'Testimonial 1 — Quote', placeholder: '...', textarea: true },
      { key: 'LP_TESTIMONIAL_1_NAME', label: 'Testimonial 1 — Name', placeholder: 'Kim Ji-yeon' },
      { key: 'LP_TESTIMONIAL_1_COMPANY', label: 'Testimonial 1 — Company', placeholder: 'CEO, Seoul Fresh Goods' },
      { key: 'LP_TESTIMONIAL_2_QUOTE', label: 'Testimonial 2 — Quote', placeholder: '...', textarea: true },
      { key: 'LP_TESTIMONIAL_2_NAME', label: 'Testimonial 2 — Name', placeholder: 'Park Soo-hyun' },
      { key: 'LP_TESTIMONIAL_2_COMPANY', label: 'Testimonial 2 — Company', placeholder: 'Founder, K-Beauty Direct' },
      { key: 'LP_TESTIMONIAL_3_QUOTE', label: 'Testimonial 3 — Quote', placeholder: '...', textarea: true },
      { key: 'LP_TESTIMONIAL_3_NAME', label: 'Testimonial 3 — Name', placeholder: 'Lee Min-ho' },
      { key: 'LP_TESTIMONIAL_3_COMPANY', label: 'Testimonial 3 — Company', placeholder: 'Operations Manager, TechHub Korea' },
    ],
  },
  {
    group: '"How to Start" Steps',
    fields: [
      { key: 'LP_STEPS_TITLE', label: 'Section Title', placeholder: 'How Do I Get Started?' },
      { key: 'LP_STEP_1_TITLE', label: 'Step 1 Title', placeholder: 'Create Your Account' },
      { key: 'LP_STEP_1_DESC', label: 'Step 1 Description', placeholder: '...', textarea: true },
      { key: 'LP_STEP_2_TITLE', label: 'Step 2 Title', placeholder: 'List Your Products' },
      { key: 'LP_STEP_2_DESC', label: 'Step 2 Description', placeholder: '...', textarea: true },
      { key: 'LP_STEP_3_TITLE', label: "Step 3 Title", placeholder: "You're Ready to Sell!" },
      { key: 'LP_STEP_3_DESC', label: 'Step 3 Description', placeholder: '...', textarea: true },
    ],
  },
  {
    group: 'Support Banner & Navigation',
    fields: [
      { key: 'LP_SUPPORT_TITLE', label: 'Support Banner Title', placeholder: 'Talk to Our Support Team' },
      { key: 'LP_SUPPORT_DESC', label: 'Support Banner Description', placeholder: '...', textarea: true },
      { key: 'LP_NAV_FEATURES', label: 'Nav: Features Link', placeholder: 'Features' },
      { key: 'LP_NAV_HOW_IT_WORKS', label: 'Nav: How It Works Link', placeholder: 'How It Works' },
      { key: 'LP_NAV_TESTIMONIALS', label: 'Nav: Testimonials Link', placeholder: 'Testimonials' },
      { key: 'LP_NAV_CONTACT', label: 'Nav: Contact Link', placeholder: 'Contact' },
    ],
  },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [notification, setNotification] = useState({ title: '', body: '', role: 'ALL' });
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  // Sync local values whenever query data changes (initial load, refetch, cache)
  useEffect(() => {
    if (settingsData?.settings) {
      const vals: Record<string, string> = {};
      (settingsData.settings as any[]).forEach((s: any) => { vals[s.key] = s.value; });
      setLocalValues(vals);
    }
  }, [settingsData]);

  // Original values from server (for change detection)
  const [serverValues, setServerValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sync server values snapshot when data loads
  useEffect(() => {
    if (settingsData?.settings) {
      const vals: Record<string, string> = {};
      (settingsData.settings as any[]).forEach((s: any) => { vals[s.key] = s.value; });
      setServerValues(vals);
    }
  }, [settingsData]);

  const notifyMutation = useMutation({
    mutationFn: () => notificationsApi.sendToAll(notification),
    onSuccess: () => { toast.success('Notification sent!'); setNotification({ title: '', body: '', role: 'ALL' }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // Check if there are unsaved changes
  const hasChanges = Object.keys(localValues).some(
    (key) => localValues[key] !== (serverValues[key] ?? '')
  );

  // Save ALL changed settings at once
  const handleSaveAll = async () => {
    const changedKeys = Object.keys(localValues).filter(
      (key) => localValues[key] !== (serverValues[key] ?? '')
    );
    if (changedKeys.length === 0) {
      toast.success('No changes to save');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        changedKeys.map((key) =>
          adminApi.updateSetting(key, localValues[key])
        )
      );
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success(`Saved ${changedKeys.length} setting${changedKeys.length > 1 ? 's' : ''} successfully`);
    } catch {
      toast.error('Some settings failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (key: string, folder: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const res = await uploadApi.uploadImage(file, folder);
      const url = res.data.url;
      setLocalValues((v) => ({ ...v, [key]: url }));
      toast.success('Image uploaded — click Save All to apply');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
      const ref = fileRefs.current[key];
      if (ref) ref.value = '';
    }
  };

  const removeImage = (key: string) => {
    setLocalValues((v) => ({ ...v, [key]: '' }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Configure app branding, settings and send notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
          <button onClick={handleSaveAll} disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'general' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'landing' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layout className="w-4 h-4" />
          Landing Page Content
        </button>
      </div>

      {/* ── Landing Page Tab ── */}
      {activeTab === 'landing' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
            <strong>💡 How it works:</strong> Edit any field, then click <strong>Save All Changes</strong> at the top. Changes appear on the Seller Landing Page at{' '}
            <a href="http://localhost:3002" target="_blank" rel="noreferrer" className="underline font-semibold">localhost:3002</a>.
            Leave a field blank to use the default English text. Both EN and KO labels fall back gracefully.
          </div>

          {LANDING_SECTIONS.map((section) => (
            <div key={section.group} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Layout className="w-4 h-4 text-primary" />
                <h2 className="text-base font-bold text-gray-900">{section.group}</h2>
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">{field.label}</label>
                    {(field as any).textarea ? (
                      <textarea
                        className="form-input w-full resize-none text-sm"
                        rows={2}
                        placeholder={field.placeholder}
                        value={localValues[field.key] || ''}
                        onChange={(e) => setLocalValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className="form-input w-full text-sm"
                        placeholder={field.placeholder}
                        value={localValues[field.key] || ''}
                        onChange={(e) => setLocalValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── General Settings Tab ── */}
      {activeTab === 'general' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── App Logos & Splash ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">App Logos & Splash Screen</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Header Logo | App Icon Logo | Splash Logo */}
              {LOGO_FIELDS.map((field) => (
                <div key={field.key}>
                  <p className="text-sm font-bold text-gray-800 mb-0.5">{field.label}</p>
                  <p className="text-xs text-gray-400 mb-2">{field.description}</p>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 flex flex-col items-center gap-2 bg-gray-50 min-h-28">
                    {localValues[field.key] ? (
                      <div className="relative">
                        <img
                          src={localValues[field.key]}
                          alt={field.label}
                          className="h-20 w-auto object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${field.label}`}
                          onClick={() => removeImage(field.key)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Image className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">No image</p>
                      </div>
                    )}
                    <input
                      ref={(el) => { fileRefs.current[field.key] = el; }}
                      type="file"
                      accept="image/*"
                      aria-label={`Upload ${field.label}`}
                      title={`Upload ${field.label}`}
                      className="hidden"
                      onChange={(e) => handleImageUpload(field.key, field.folder, e)}
                    />
                    <button
                      type="button"
                      onClick={() => fileRefs.current[field.key]?.click()}
                      disabled={!!uploading[field.key]}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                    >
                      <Upload className="w-3 h-3" />
                      {uploading[field.key] ? 'Uploading...' : localValues[field.key] ? 'Change' : 'Upload'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Splash Background Color + App Name + Brand Color */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-100">
              {/* Splash BG Color */}
              <div>
                <p className="text-sm font-bold text-gray-800 mb-0.5">Splash Screen Background</p>
                <p className="text-xs text-gray-400 mb-2">Background color shown on the loading screen.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Splash Background Color"
                    className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    value={localValues['SPLASH_BG_COLOR'] || '#10B981'}
                    onChange={(e) => {
                      setLocalValues((v) => ({ ...v, SPLASH_BG_COLOR: e.target.value }));
                    }}
                  />
                  <span className="text-sm text-gray-500 font-mono">{localValues['SPLASH_BG_COLOR'] || '#10B981'}</span>
                </div>
              </div>

              {/* App Name */}
              <div>
                <p className="text-sm font-bold text-gray-800 mb-0.5">App Name</p>
                <p className="text-xs text-gray-400 mb-2">Shown in notifications and fallback text.</p>
                <input
                  id="app-name"
                  aria-label="App Name"
                  className="form-input w-full text-sm"
                  value={localValues['APP_NAME'] || ''}
                  placeholder="Your App Name"
                  onChange={(e) => setLocalValues((v) => ({ ...v, APP_NAME: e.target.value }))}
                />
              </div>

              {/* Brand Primary Color */}
              <div>
                <p className="text-sm font-bold text-gray-800 mb-0.5">Brand Primary Color</p>
                <p className="text-xs text-gray-400 mb-2">Main color used in buttons and accents.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Brand Primary Color"
                    className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                    value={localValues['PRIMARY_COLOR'] || '#10B981'}
                    onChange={(e) => {
                      setLocalValues((v) => ({ ...v, PRIMARY_COLOR: e.target.value }));
                    }}
                  />
                  <span className="text-sm text-gray-500 font-mono">{localValues['PRIMARY_COLOR'] || '#10B981'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* App Configuration */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">App Configuration</h2>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {TEXT_SETTINGS.filter(s => s.key !== 'APP_NAME').map((setting) => (
                <div key={setting.key}>
                  <label htmlFor={`setting-${setting.key}`} className="text-sm font-semibold text-gray-700">{setting.label}</label>
                  <input
                    id={`setting-${setting.key}`}
                    className="form-input w-full mt-1"
                    value={localValues[setting.key] || ''}
                    onChange={(e) => setLocalValues((v) => ({ ...v, [setting.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Toggles */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <ToggleLeft className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">App Feature Toggles</h2>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {FEATURE_FLAGS.map((flag) => {
                const isEnabled = localValues[flag.key] === 'true';
                return (
                  <div key={flag.key} className="flex items-center justify-between py-4">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{flag.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{flag.description}</div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Toggle ${flag.label}`}
                      onClick={() => {
                        const newVal = isEnabled ? 'false' : 'true';
                        setLocalValues((v) => ({ ...v, [flag.key]: newVal }));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        isEnabled ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Send Push Notification</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Target Audience</label>
              <select
                aria-label="Target audience"
                className="form-input mt-1"
                value={notification.role}
                onChange={(e) => setNotification((n) => ({ ...n, role: e.target.value }))}
              >
                <option value="ALL">All Users</option>
                <option value="CUSTOMER">Customers Only</option>
                <option value="SELLER">Sellers Only</option>
                <option value="RIDER">Riders Only</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Title</label>
              <input
                className="form-input mt-1"
                placeholder="Notification title..."
                value={notification.title}
                onChange={(e) => setNotification((n) => ({ ...n, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Message</label>
              <input
                className="form-input mt-1"
                placeholder="Notification body..."
                value={notification.body}
                onChange={(e) => setNotification((n) => ({ ...n, body: e.target.value }))}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn-primary mt-4 flex items-center gap-2"
            onClick={() => notifyMutation.mutate()}
            disabled={!notification.title || !notification.body || notifyMutation.isPending}
          >
            <Send className="w-4 h-4" />
            {notifyMutation.isPending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
      )} {/* end general tab */}

      {/* Sticky bottom save bar */}
      {hasChanges && (
        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <span className="text-sm text-amber-600 font-medium">
            You have unsaved changes
          </span>
          <button onClick={handleSaveAll} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
