'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import {
  Globe, Type, MessageSquare, BarChart3, ShoppingBag, Star,
  Download, Footprints, Image as ImageIcon, ExternalLink, Save, Upload,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/* ─── Section config — defines ALL editable fields ───────────────────── */
const SECTIONS = [
  {
    label: 'Navigation Labels',
    icon: Globe,
    fields: [
      { key: 'LP_NAV_FEATURES',      label: 'Nav: Services',       placeholder: 'Services' },
      { key: 'LP_NAV_HOW_IT_WORKS',  label: 'Nav: How It Works',   placeholder: 'How It Works' },
      { key: 'LP_NAV_TESTIMONIALS',  label: 'Nav: Reviews',        placeholder: 'Reviews' },
      { key: 'LP_NAV_CONTACT',       label: 'Nav: Contact',        placeholder: 'Contact' },
    ],
  },
  {
    label: 'Hero Section',
    icon: Type,
    fields: [
      { key: 'LP_HERO_TITLE',         label: 'Hero Title',         placeholder: 'Everything You Need, Delivered' },
      { key: 'LP_HERO_SUBTITLE',      label: 'Hero Subtitle',      placeholder: 'Shop groceries, recharge phones...', multiline: true },
      { key: 'LP_HERO_CTA_PRIMARY',   label: 'Primary Button Text', placeholder: 'Download App' },
      { key: 'LP_HERO_CTA_SECONDARY', label: 'Secondary Button Text', placeholder: 'Learn More' },
    ],
  },
  {
    label: 'Hero Background',
    icon: ImageIcon,
    fields: [
      { key: 'LP_HERO_BG_TYPE',  label: 'Background Type', placeholder: 'animation', type: 'select',
        options: [
          { value: 'animation', label: 'Delivery Map Animation (default)' },
          { value: 'image',     label: 'Custom Background Image' },
          { value: 'video',     label: 'Custom Background Video' },
          { value: 'none',      label: 'Plain Gradient (no animation)' },
        ] },
      { key: 'LP_HERO_BG_IMAGE', label: 'Background Image (used when type = image)', type: 'image' },
      { key: 'LP_HERO_BG_VIDEO', label: 'Background Video (used when type = video)', placeholder: 'https://example.com/video.mp4', type: 'video' },
      { key: 'LP_HERO_VIDEO_LOOP', label: 'Video Loop', type: 'select',
        options: [
          { value: 'true', label: 'Loop (video repeats)' },
          { value: 'false', label: 'No Loop (plays once)' },
        ] },
      { key: 'LP_HERO_VIDEO_FIT', label: 'Video Display Mode', type: 'select',
        options: [
          { value: 'cover', label: 'Cover (fill entire hero, may crop edges)' },
          { value: 'contain', label: 'Contain (show full video, may have bars)' },
          { value: 'fill', label: 'Stretch (fill hero, may distort)' },
        ] },
      { key: 'LP_HERO_VIDEO_POSITION', label: 'Video Focal Point (crop position)', type: 'select',
        options: [
          { value: 'center', label: 'Center (default)' },
          { value: 'top', label: 'Top' },
          { value: 'bottom', label: 'Bottom' },
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'top left', label: 'Top Left' },
          { value: 'top right', label: 'Top Right' },
          { value: 'bottom left', label: 'Bottom Left' },
          { value: 'bottom right', label: 'Bottom Right' },
        ] },
      { key: 'LP_HERO_VIDEO_OVERLAY', label: 'Video Overlay Opacity', type: 'select',
        options: [
          { value: '0', label: 'No Overlay (full brightness)' },
          { value: '20', label: 'Light (20%)' },
          { value: '40', label: 'Medium (40%)' },
          { value: '60', label: 'Strong (60%)' },
          { value: '70', label: 'Very Strong (70%)' },
        ] },
    ],
  },
  {
    label: 'Statistics',
    icon: BarChart3,
    fields: [
      { key: 'LP_STATS_CUSTOMERS',  label: 'Customers Count',   placeholder: '10000' },
      { key: 'LP_STATS_PRODUCTS',   label: 'Products Count',    placeholder: '5000' },
      { key: 'LP_STATS_SELLERS',    label: 'Sellers Count',     placeholder: '200' },
      { key: 'LP_STATS_DELIVERIES', label: 'Deliveries Count',  placeholder: '50000' },
    ],
  },
  {
    label: 'Services (4 cards)',
    icon: ShoppingBag,
    fields: [
      { key: 'LP_SERVICE_1_TITLE', label: 'Service 1 Title', placeholder: 'Grocery Shopping' },
      { key: 'LP_SERVICE_1_DESC',  label: 'Service 1 Description', placeholder: 'Fresh produce...', multiline: true },
      { key: 'LP_SERVICE_1_ICON',  label: 'Service 1 Icon Keyword', placeholder: 'shopping | topup | sim | exchange | delivery | global' },
      { key: 'LP_SERVICE_2_TITLE', label: 'Service 2 Title', placeholder: 'Mobile Top-Up' },
      { key: 'LP_SERVICE_2_DESC',  label: 'Service 2 Description', placeholder: 'Instant mobile...', multiline: true },
      { key: 'LP_SERVICE_2_ICON',  label: 'Service 2 Icon Keyword', placeholder: 'shopping | topup | sim | exchange | delivery | global' },
      { key: 'LP_SERVICE_3_TITLE', label: 'Service 3 Title', placeholder: 'SIM Cards' },
      { key: 'LP_SERVICE_3_DESC',  label: 'Service 3 Description', placeholder: 'Browse and reserve...', multiline: true },
      { key: 'LP_SERVICE_3_ICON',  label: 'Service 3 Icon Keyword', placeholder: 'shopping | topup | sim | exchange | delivery | global' },
      { key: 'LP_SERVICE_4_TITLE', label: 'Service 4 Title', placeholder: 'Exchange Rates' },
      { key: 'LP_SERVICE_4_DESC',  label: 'Service 4 Description', placeholder: 'Compare real-time...', multiline: true },
      { key: 'LP_SERVICE_4_ICON',  label: 'Service 4 Icon Keyword', placeholder: 'shopping | topup | sim | exchange | delivery | global' },
    ],
  },
  {
    label: 'Market Section',
    icon: Globe,
    fields: [
      { key: 'LP_MARKET_TITLE',    label: 'Market Section Title',    placeholder: 'One App, Everything You Need' },
      { key: 'LP_MARKET_SUBTITLE', label: 'Market Section Subtitle', placeholder: 'From daily groceries...' },
    ],
  },
  {
    label: 'Why Choose Us (3 features)',
    icon: Star,
    fields: [
      { key: 'LP_WHY_TITLE',       label: 'Section Title',          placeholder: 'Why Choose Us' },
      { key: 'LP_WHY_SUBTITLE',    label: 'Section Subtitle',       placeholder: 'Built for convenience...' },
      { key: 'LP_FEATURE_1_TITLE', label: 'Feature 1 Title',        placeholder: 'Fast & Reliable' },
      { key: 'LP_FEATURE_1_DESC',  label: 'Feature 1 Description',  placeholder: 'Get your orders...', multiline: true },
      { key: 'LP_FEATURE_2_TITLE', label: 'Feature 2 Title',        placeholder: 'Secure Payments' },
      { key: 'LP_FEATURE_2_DESC',  label: 'Feature 2 Description',  placeholder: 'Your transactions...', multiline: true },
      { key: 'LP_FEATURE_3_TITLE', label: 'Feature 3 Title',        placeholder: '24/7 Support' },
      { key: 'LP_FEATURE_3_DESC',  label: 'Feature 3 Description',  placeholder: 'Our support team...', multiline: true },
    ],
  },
  {
    label: 'How It Works (3 steps)',
    icon: Footprints,
    fields: [
      { key: 'LP_STEPS_TITLE',    label: 'Section Title',       placeholder: 'How It Works' },
      { key: 'LP_STEP_1_TITLE',   label: 'Step 1 Title',        placeholder: 'Download the App' },
      { key: 'LP_STEP_1_DESC',    label: 'Step 1 Description',  placeholder: 'Available on Android...', multiline: true },
      { key: 'LP_STEP_2_TITLE',   label: 'Step 2 Title',        placeholder: 'Browse & Order' },
      { key: 'LP_STEP_2_DESC',    label: 'Step 2 Description',  placeholder: 'Explore products...', multiline: true },
      { key: 'LP_STEP_3_TITLE',   label: 'Step 3 Title',        placeholder: 'Get it Delivered' },
      { key: 'LP_STEP_3_DESC',    label: 'Step 3 Description',  placeholder: 'Sit back and relax...', multiline: true },
    ],
  },
  {
    label: 'Testimonials (3 reviews)',
    icon: MessageSquare,
    fields: [
      { key: 'LP_TESTIMONIAL_1_QUOTE',   label: 'Review 1 Quote',   placeholder: 'The best delivery app...', multiline: true },
      { key: 'LP_TESTIMONIAL_1_NAME',    label: 'Review 1 Name',    placeholder: 'Sarah K.' },
      { key: 'LP_TESTIMONIAL_1_COMPANY', label: 'Review 1 Title',   placeholder: 'Customer' },
      { key: 'LP_TESTIMONIAL_2_QUOTE',   label: 'Review 2 Quote',   placeholder: 'SIM card ordering...', multiline: true },
      { key: 'LP_TESTIMONIAL_2_NAME',    label: 'Review 2 Name',    placeholder: 'Ahmed M.' },
      { key: 'LP_TESTIMONIAL_2_COMPANY', label: 'Review 2 Title',   placeholder: 'Customer' },
      { key: 'LP_TESTIMONIAL_3_QUOTE',   label: 'Review 3 Quote',   placeholder: 'Exchange rates...', multiline: true },
      { key: 'LP_TESTIMONIAL_3_NAME',    label: 'Review 3 Name',    placeholder: 'Ji-Young P.' },
      { key: 'LP_TESTIMONIAL_3_COMPANY', label: 'Review 3 Title',   placeholder: 'Customer' },
    ],
  },
  {
    label: 'Download Section',
    icon: Download,
    fields: [
      { key: 'LP_DOWNLOAD_TITLE',    label: 'Download Title',      placeholder: 'Download the App Now' },
      { key: 'LP_DOWNLOAD_SUBTITLE', label: 'Download Subtitle',   placeholder: 'Available on Android and iOS...' },
      { key: 'LP_PLAY_STORE_URL',    label: 'Google Play Store URL', placeholder: 'https://play.google.com/store/apps/details?id=...' },
      { key: 'LP_APP_STORE_URL',     label: 'Apple App Store URL',  placeholder: 'https://apps.apple.com/app/...' },
      { key: 'LP_QR_ANDROID',        label: 'Android QR Code',     type: 'image' },
      { key: 'LP_QR_IOS',            label: 'iOS QR Code',         type: 'image' },
    ],
  },
  {
    label: 'Support & Footer',
    icon: Globe,
    fields: [
      { key: 'LP_SUPPORT_TITLE', label: 'Support Title',     placeholder: 'Need Help?' },
      { key: 'LP_SUPPORT_DESC',  label: 'Support Description', placeholder: 'Our support team...', multiline: true },
      { key: 'LP_FOOTER_TEXT',   label: 'Footer Text',       placeholder: 'Your trusted marketplace...' },
      { key: 'LP_FOOTER_COPYRIGHT', label: 'Copyright Text', placeholder: '© 2026 Your Brand. All rights reserved.' },
    ],
  },
  {
    label: 'App Screenshots',
    icon: ImageIcon,
    fields: [
      { key: 'LP_APP_SCREENSHOT_1', label: 'Hero Phone Screenshot', type: 'image' },
      { key: 'LP_APP_SCREENSHOT_2', label: 'Screenshot 2 (future)', type: 'image' },
      { key: 'LP_APP_SCREENSHOT_3', label: 'Screenshot 3 (future)', type: 'image' },
    ],
  },
];

/* ─── Image uploader component ───────────────────────────────────────── */
function ImageUpload({ settingKey, currentValue, onUploaded }: {
  settingKey: string; currentValue: string; onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'landing');
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/upload/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      const url = data.url || data.imageUrl || '';
      if (url) {
        onUploaded(url);
        toast.success('Image uploaded');
      } else {
        toast.error('Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
        {currentValue && (
          <button onClick={() => onUploaded('')} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      {currentValue && (
        <div className="mt-2">
          <img src={currentValue} alt="" className="h-24 w-auto object-contain rounded-lg border border-gray-200" />
        </div>
      )}
    </div>
  );
}

/* ─── Video uploader component (upload + URL input, no size limit) ──── */
function VideoUpload({ settingKey, currentValue, onUploaded, onUrlChange, onSave }: {
  settingKey: string; currentValue: string;
  onUploaded: (url: string) => void;
  onUrlChange: (value: string) => void;
  onSave: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'videos');
      const token = localStorage.getItem('adminToken');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/upload/image`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          const url = data.url || data.imageUrl || '';
          if (url) {
            onUploaded(url);
            toast.success('Video uploaded successfully');
          } else {
            toast.error('Upload failed — no URL returned');
          }
        } else {
          toast.error('Video upload failed');
        }
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
      };

      xhr.onerror = () => {
        toast.error('Video upload failed');
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
      };

      xhr.send(formData);
    } catch {
      toast.error('Video upload failed');
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isVideoUrl = currentValue && (
    currentValue.startsWith('http') || currentValue.startsWith('data:video')
  );

  return (
    <div className="space-y-3">
      {/* Upload button row */}
      <div className="flex items-center gap-3">
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Upload className="w-4 h-4" /> {uploading ? `Uploading… ${progress}%` : 'Upload Video'}
        </button>
        {currentValue && (
          <button onClick={() => onUploaded('')} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      <input ref={inputRef} type="file" accept="video/*" onChange={handleUpload} className="hidden" />

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">OR paste URL</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* URL text input with save */}
      <div className="flex gap-2">
        <input
          type="text"
          value={currentValue}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/video.mp4"
          className="flex-1 form-input text-sm"
        />
        <button onClick={onSave}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          title="Save">
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Video preview */}
      {isVideoUrl && (
        <div className="mt-2">
          <video src={currentValue} controls className="h-32 w-auto rounded-lg border border-gray-200" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  ADMIN CMS — Landing Page Editor                                      */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function LandingPageAdmin() {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.label, true]))
  );

  // Fetch all settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => adminApi.getSettings().then((r) => r.data),
  });

  // Build map of current values
  const settingsMap = useMemo(() => {
    const map: Record<string, string> = {};
    (settingsData?.settings || []).forEach((s: any) => { map[s.key] = s.value ?? ''; });
    return map;
  }, [settingsData]);

  // Track saving state
  const [saving, setSaving] = useState(false);

  const getValue = (key: string) => localValues[key] ?? settingsMap[key] ?? '';

  const handleChange = (key: string, value: string) => {
    setLocalValues((v) => ({ ...v, [key]: value }));
  };

  // Store uploaded file URL locally only — no auto-save
  const handleFileUploaded = (key: string, url: string) => {
    setLocalValues((v) => ({ ...v, [key]: url }));
  };

  // Check if there are unsaved changes
  const hasChanges = Object.keys(localValues).some(
    (key) => localValues[key] !== (settingsMap[key] ?? '')
  );

  // Save ALL changed fields at once
  const handleSaveAll = async () => {
    const changedKeys = Object.keys(localValues).filter(
      (key) => localValues[key] !== (settingsMap[key] ?? '')
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
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setLocalValues({});
      toast.success(`Saved ${changedKeys.length} setting${changedKeys.length > 1 ? 's' : ''} successfully`);
    } catch {
      toast.error('Some settings failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (label: string) => {
    setOpenSections((o) => ({ ...o, [label]: !o[label] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Landing Page</h1>
          <p className="text-sm text-gray-500 mt-1">Edit every text, image, and link on your public landing page</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
          )}
          <button onClick={handleSaveAll} disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            <ExternalLink className="w-4 h-4" /> Preview
          </a>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections[section.label] !== false;
          return (
            <div key={section.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Section header */}
              <button onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-gray-900">{section.label}</span>
                  <span className="text-xs text-gray-400">{section.fields.length} fields</span>
                </div>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-5 h-5" />
                </span>
              </button>

              {/* Fields */}
              {isOpen && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
                  {section.fields.map((field: any) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        <span className="text-xs text-gray-400 ml-2 font-mono">{field.key}</span>
                      </label>

                      {field.type === 'select' ? (
                        <select
                          value={getValue(field.key) || field.options?.[0]?.value || ''}
                          onChange={(e) => { handleChange(field.key, e.target.value); }}
                          className="w-full form-input text-sm">
                          {(field.options || []).map((opt: any) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'image' ? (
                        <ImageUpload
                          settingKey={field.key}
                          currentValue={getValue(field.key)}
                          onUploaded={(url) => handleFileUploaded(field.key, url)}
                        />
                      ) : field.type === 'video' ? (
                        <VideoUpload
                          settingKey={field.key}
                          currentValue={getValue(field.key)}
                          onUploaded={(url) => handleFileUploaded(field.key, url)}
                          onUrlChange={(value) => handleChange(field.key, value)}
                          onSave={handleSaveAll}
                        />
                      ) : field.multiline ? (
                        <textarea
                          value={getValue(field.key)}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full form-input text-sm resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={getValue(field.key)}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full form-input text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom save bar (sticky) */}
      {hasChanges && (
        <div className="sticky bottom-0 mt-6 -mx-6 px-6 py-4 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center justify-between rounded-b-xl">
          <span className="text-sm text-amber-600 font-medium">
            You have unsaved changes
          </span>
          <button onClick={handleSaveAll} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

function ChevronDown(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
