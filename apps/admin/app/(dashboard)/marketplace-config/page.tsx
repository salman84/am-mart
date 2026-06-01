'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Globe2, Home, Languages, Landmark, PackageCheck, ShieldCheck,
  SlidersHorizontal, Truck, WalletCards,
} from 'lucide-react';
import { marketplaceConfigApi } from '../../../lib/api';

type Tab = 'overview' | 'seller-form' | 'documents' | 'homepage' | 'policies' | 'translations' | 'payments' | 'shipping' | 'commissions';

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'seller-form', label: 'Seller Form' },
  { key: 'documents', label: 'Documents' },
  { key: 'homepage', label: 'Homepage CMS' },
  { key: 'policies', label: 'Policies' },
  { key: 'translations', label: 'Translations' },
  { key: 'payments', label: 'Payments' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'commissions', label: 'Commissions' },
];

const roadmap = [
  'Local and global seller onboarding',
  'Admin editable seller registration fields',
  'Korean and global document requirements',
  'Homepage CMS sections and translations',
  'Policy pages with version history',
  'Product compliance and KC readiness',
  'Payment, shipping, commission, settlement settings',
  'Audit logs, roles, and security controls',
];

export default function MarketplaceConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const overview = useQuery({
    queryKey: ['marketplace-config-overview'],
    queryFn: () => marketplaceConfigApi.getOverview().then((r) => r.data),
  });

  const fields = useQuery({
    queryKey: ['seller-form-fields'],
    queryFn: () => marketplaceConfigApi.getSellerFormFields('en').then((r) => r.data),
    enabled: activeTab === 'seller-form',
  });

  const documents = useQuery({
    queryKey: ['seller-document-requirements'],
    queryFn: () => marketplaceConfigApi.getDocumentRequirements('en').then((r) => r.data),
    enabled: activeTab === 'documents',
  });

  const homepage = useQuery({
    queryKey: ['homepage-sections'],
    queryFn: () => marketplaceConfigApi.getHomepageSections('en').then((r) => r.data),
    enabled: activeTab === 'homepage',
  });

  const policies = useQuery({
    queryKey: ['policy-pages'],
    queryFn: () => marketplaceConfigApi.getPolicyPages('en').then((r) => r.data),
    enabled: activeTab === 'policies',
  });

  const translations = useQuery({
    queryKey: ['marketplace-translations'],
    queryFn: () => marketplaceConfigApi.getTranslations('en').then((r) => r.data),
    enabled: activeTab === 'translations',
  });

  const payments = useQuery({
    queryKey: ['payment-providers'],
    queryFn: () => marketplaceConfigApi.getPaymentProviders().then((r) => r.data),
    enabled: activeTab === 'payments',
  });

  const shipping = useQuery({
    queryKey: ['shipping-methods'],
    queryFn: () => marketplaceConfigApi.getShippingMethods().then((r) => r.data),
    enabled: activeTab === 'shipping',
  });

  const commissions = useQuery({
    queryKey: ['commission-rules'],
    queryFn: () => marketplaceConfigApi.getCommissionRules().then((r) => r.data),
    enabled: activeTab === 'commissions',
  });

  const stats = useMemo(() => [
    { label: 'Seller Form Fields', value: overview.data?.sellerFormFields || 0, icon: FileText },
    { label: 'Document Rules', value: overview.data?.documentRequirements || 0, icon: ShieldCheck },
    { label: 'Homepage Sections', value: overview.data?.homepageSections || 0, icon: Home },
    { label: 'Policy Pages', value: overview.data?.policyPages || 0, icon: Globe2 },
    { label: 'Translations', value: overview.data?.translations || 0, icon: Languages },
    { label: 'Payment Providers', value: overview.data?.paymentProviders || 0, icon: WalletCards },
    { label: 'Shipping Methods', value: overview.data?.shippingMethods || 0, icon: Truck },
    { label: 'Commission Rules', value: overview.data?.commissionRules || 0, icon: Landmark },
  ], [overview.data]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2">
          <SlidersHorizontal className="w-4 h-4" />
          Marketplace SaaS Configuration
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editable Marketplace Platform</h1>
        <p className="text-gray-500 mt-1">
          Configure seller onboarding, document rules, homepage CMS, policies, translations, payments, shipping, and compliance — fully dynamic, no hardcoded values.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-800">
        <strong>Legal readiness note:</strong> This platform provides marketplace software features. The platform owner is responsible for checking business registration, mail order sales reporting, tax, payment gateway, privacy, product safety, and local legal requirements before launch.
      </div>

      <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="stat-card">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-gray-900">Build Roadmap</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {roadmap.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'seller-form' && (
        <ConfigTable
          loading={fields.isLoading}
          empty="No seller form fields are configured yet."
          rows={fields.data || []}
          columns={['sectionKey', 'fieldKey', 'label', 'fieldType', 'required', 'enabled']}
          onSave={(row, data) => marketplaceConfigApi.updateSellerFormField(row.id, data).then(() => fields.refetch())}
        />
      )}

      {activeTab === 'documents' && (
        <ConfigTable
          loading={documents.isLoading}
          empty="No document requirements are configured yet."
          rows={documents.data || []}
          columns={['documentType', 'title', 'required', 'enabled', 'sellerScopes', 'sellerAccountTypes']}
          onSave={(row, data) => marketplaceConfigApi.updateDocumentRequirement(row.id, data).then(() => documents.refetch())}
        />
      )}

      {activeTab === 'homepage' && (
        <ConfigTable
          loading={homepage.isLoading}
          empty="No homepage sections are configured yet."
          rows={homepage.data || []}
          columns={['sectionKey', 'type', 'title', 'languageCode', 'isVisible', 'sortOrder']}
          onSave={(row, data) => marketplaceConfigApi.updateHomepageSection(row.id, data).then(() => homepage.refetch())}
        />
      )}

      {activeTab === 'policies' && (
        <ConfigTable
          loading={policies.isLoading}
          empty="No policy pages are configured yet."
          rows={policies.data || []}
          columns={['slug', 'pageType', 'title', 'languageCode', 'version', 'status']}
          onSave={(row, data) => marketplaceConfigApi.updatePolicyPage(row.id, data).then(() => policies.refetch())}
        />
      )}

      {activeTab === 'translations' && (
        <ConfigTable
          loading={translations.isLoading}
          empty="No translations are configured yet."
          rows={translations.data || []}
          columns={['namespace', 'key', 'value', 'languageCode']}
          onSave={(row, data) => marketplaceConfigApi.updateTranslation(row.key, data).then(() => translations.refetch())}
        />
      )}

      {activeTab === 'payments' && (
        <ConfigTable
          loading={payments.isLoading}
          empty="No payment providers are configured yet."
          rows={payments.data || []}
          columns={['provider', 'displayName', 'enabled', 'testMode', 'settlementFeeRate']}
          onSave={(row, data) => marketplaceConfigApi.updatePaymentProvider(row.id, data).then(() => payments.refetch())}
        />
      )}

      {activeTab === 'shipping' && (
        <ConfigTable
          loading={shipping.isLoading}
          empty="No shipping methods are configured yet."
          rows={shipping.data || []}
          columns={['name', 'type', 'enabled', 'baseFee', 'freeShippingThreshold', 'sortOrder']}
          onSave={(row, data) => marketplaceConfigApi.updateShippingMethod(row.id, data).then(() => shipping.refetch())}
        />
      )}

      {activeTab === 'commissions' && (
        <ConfigTable
          loading={commissions.isLoading}
          empty="No commission rules are configured yet."
          rows={commissions.data || []}
          columns={['name', 'commissionRate', 'paymentFeeRate', 'enabled', 'priority']}
          onSave={(row, data) => marketplaceConfigApi.updateCommissionRule(row.id, data).then(() => commissions.refetch())}
        />
      )}
    </div>
  );
}

function ConfigTable({
  loading,
  empty,
  rows,
  columns,
  onSave,
}: {
  loading: boolean;
  empty: string;
  rows: any[];
  columns: string[];
  onSave?: (row: any, data: any) => Promise<any>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <SlidersHorizontal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">{empty}</p>
        <p className="text-sm text-gray-400 mt-1">The database and API structure is ready; seed/configuration UI comes next.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="font-bold text-gray-900">Editable records</h2>
          <p className="text-sm text-gray-500">Edit saves to the database through the Marketplace SaaS API.</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="table-th">{column}</th>
              ))}
              {onSave && <th className="table-th">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              editingId === row.id ? (
                <tr key={row.id}>
                  <td colSpan={columns.length + 1} className="p-4">
                    <textarea
                      className="form-input min-h-[260px] font-mono text-xs"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={async () => {
                          if (!onSave) return;
                          setSaving(true);
                          try {
                            await onSave(row, JSON.parse(draft));
                            setEditingId(null);
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="btn-primary"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column} className="table-td">
                      {Array.isArray(row[column]) ? row[column].join(', ') : String(row[column] ?? '')}
                    </td>
                  ))}
                  {onSave && (
                    <td className="table-td">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(row.id);
                          setDraft(JSON.stringify(cleanEditableRow(row), null, 2));
                        }}
                        className="btn-secondary"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cleanEditableRow(row: any) {
  const {
    id,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    lastUpdatedBy,
    ...editable
  } = row;
  return editable;
}
