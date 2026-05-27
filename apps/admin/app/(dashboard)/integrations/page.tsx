'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api';
import { Eye, EyeOff, Plug, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface SettingMap {
  [key: string]: string;
}

interface GatewayField {
  key: string;
  label: string;
  type?: 'password' | 'text';
}

interface Gateway {
  name: string;
  region: string;
  regionColor: string;
  enabledKey: string;
  fields: GatewayField[];
}

const GATEWAYS: Gateway[] = [
  {
    name: 'Toss Payments',
    region: 'Korea',
    regionColor: 'bg-blue-100 text-blue-700',
    enabledKey: 'PAYMENT_TOSS_ENABLED',
    fields: [
      { key: 'PAYMENT_TOSS_API_KEY', label: 'API Key', type: 'password' },
      { key: 'PAYMENT_TOSS_SECRET', label: 'Secret Key', type: 'password' },
    ],
  },
  {
    name: 'Stripe',
    region: 'Global',
    regionColor: 'bg-purple-100 text-purple-700',
    enabledKey: 'PAYMENT_STRIPE_ENABLED',
    fields: [
      { key: 'PAYMENT_STRIPE_KEY', label: 'Publishable Key', type: 'password' },
      { key: 'PAYMENT_STRIPE_SECRET', label: 'Secret Key', type: 'password' },
      { key: 'PAYMENT_STRIPE_WEBHOOK', label: 'Webhook Secret', type: 'password' },
    ],
  },
  {
    name: 'KakaoPay',
    region: 'Korea',
    regionColor: 'bg-yellow-100 text-yellow-700',
    enabledKey: 'PAYMENT_KAKAO_ENABLED',
    fields: [
      { key: 'PAYMENT_KAKAO_CID', label: 'CID', type: 'password' },
      { key: 'PAYMENT_KAKAO_ADMIN_KEY', label: 'Admin Key', type: 'password' },
    ],
  },
  {
    name: 'PayPal',
    region: 'Global',
    regionColor: 'bg-indigo-100 text-indigo-700',
    enabledKey: 'PAYMENT_PAYPAL_ENABLED',
    fields: [
      { key: 'PAYMENT_PAYPAL_CLIENT_ID', label: 'Client ID', type: 'password' },
      { key: 'PAYMENT_PAYPAL_SECRET', label: 'Secret', type: 'password' },
    ],
  },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={enabled ? 'Disable' : 'Enable'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-primary' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function GatewayCard({ gateway, settings, onSave }: { gateway: Gateway; settings: SettingMap; onSave: (updates: SettingMap) => void }) {
  const [localValues, setLocalValues] = useState<SettingMap>(() => {
    const vals: SettingMap = {};
    gateway.fields.forEach((f) => { vals[f.key] = settings[f.key] || ''; });
    vals[gateway.enabledKey] = settings[gateway.enabledKey] || 'false';
    return vals;
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const enabled = localValues[gateway.enabledKey] === 'true';

  const toggleEnabled = () => {
    setLocalValues((v) => ({ ...v, [gateway.enabledKey]: enabled ? 'false' : 'true' }));
  };

  const handleSave = () => {
    onSave(localValues);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Plug className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{gateway.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gateway.regionColor}`}>
                {gateway.region}
              </span>
            </div>
            <span className={`text-xs font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
        <Toggle enabled={enabled} onChange={toggleEnabled} />
      </div>

      <div className="space-y-3 mb-5">
        {gateway.fields.map((field) => (
          <div key={field.key}>
            <label className="text-sm font-semibold text-gray-700 block mb-1">{field.label}</label>
            <div className="relative">
              <input
                type={showKeys[field.key] ? 'text' : 'password'}
                className="form-input pr-10"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                value={localValues[field.key] || ''}
                onChange={(e) => setLocalValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
              <button
                type="button"
                aria-label={showKeys[field.key] ? 'Hide' : 'Show'}
                onClick={() => setShowKeys((s) => ({ ...s, [field.key]: !s[field.key] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="btn-primary flex items-center gap-2 w-full justify-center"
      >
        <Save className="w-4 h-4" />
        Save {gateway.name}
      </button>
    </div>
  );
}

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const [settingsMap, setSettingsMap] = useState<SettingMap>({});

  useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      adminApi.getSettings().then((r) => {
        const settings: Array<{ key: string; value: string }> = r.data?.settings || [];
        const map: SettingMap = {};
        settings.forEach((s) => { map[s.key] = s.value; });
        setSettingsMap(map);
        return r.data;
      }),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: SettingMap) => {
      for (const [key, value] of Object.entries(updates)) {
        await adminApi.updateSetting(key, value);
      }
    },
    onSuccess: () => {
      toast.success('Gateway settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Integrations</h1>
        <p className="text-gray-500 mt-1">Configure payment gateways and third-party services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {GATEWAYS.map((gw) => (
          <GatewayCard
            key={gw.name}
            gateway={gw}
            settings={settingsMap}
            onSave={(updates) => updateMutation.mutate(updates)}
          />
        ))}
      </div>
    </div>
  );
}
