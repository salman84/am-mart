'use client';

import { useState, useEffect, useRef } from 'react';
import { exchangeRatesApi } from '../../../lib/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, Plus, RefreshCw, Trash2, Edit2, Search, Globe,
  CheckCircle, XCircle, Star, Clock, ChevronDown, X, Zap,
  ArrowRight, BarChart2, AlertCircle, Settings2,
} from 'lucide-react';

type TabType = 'providers' | 'add' | 'logs';

interface Provider {
  id: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  country: string;
  officialWebsite?: string;
  status: string;
  fetchMethod: string;
  isVerified: boolean;
  isFeatured: boolean;
  transferTime?: string;
  rateSpreadPercent?: number;
  rates: any[];
  updateLogs?: any[];
}

interface Preset {
  companyName: string;
  slug: string;
  country: string;
  officialWebsite: string;
  appDeepLink?: string;
  fetchMethod: string;
  scraperKey?: string;
  sourceUrl?: string;
  supportedSendCurrencies: string[];
  supportedRecvCurrencies: string[];
  transferTime?: string;
  isVerified: boolean;
  rateSpreadPercent?: number;
}

const CURRENCIES = ['KRW', 'USD', 'PHP', 'BDT', 'NPR', 'VND', 'INR', 'PKR', 'MMK', 'IDR', 'THB', 'CNY', 'JPY', 'EUR', 'GBP'];

const FETCH_METHOD_LABELS: Record<string, string> = {
  MANUAL: 'Manual Entry',
  FOREX_API: 'Forex API (auto)',
  WISE_API: 'Wise API (auto)',
  HTML_SCRAPER: 'HTML Scraper (auto)',
  BROWSER_SCRAPER: 'Live Scraper — actual company rates',
};

const FETCH_METHOD_COLORS: Record<string, string> = {
  MANUAL: 'bg-gray-100 text-gray-600',
  FOREX_API: 'bg-blue-100 text-blue-700',
  WISE_API: 'bg-purple-100 text-purple-700',
  HTML_SCRAPER: 'bg-orange-100 text-orange-700',
  BROWSER_SCRAPER: 'bg-green-100 text-green-700',
};

export default function ExchangeRatesPage() {
  const [tab, setTab] = useState<TabType>('providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add/Edit form
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState({
    companyName: '', slug: '', logoUrl: '', country: 'KR',
    officialWebsite: '', appDeepLink: '', fetchMethod: 'MANUAL',
    scraperKey: '', sourceUrl: '', isVerified: false, isFeatured: false,
    priority: 50, transferTime: '', minAmount: '', maxAmount: '', notes: '',
    supportedSendCurrencies: ['KRW'], supportedRecvCurrencies: [] as string[],
  });
  const [savingForm, setSavingForm] = useState(false);

  // Rate entry
  const [rateForm, setRateForm] = useState({ providerId: '', sendCurrency: 'KRW', recvCurrency: 'PHP', rate: '', transferFee: '' });
  const [savingRate, setSavingRate] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  // Compare
  const [compareSend, setCompareSend] = useState('KRW');
  const [compareRecv, setCompareRecv] = useState('PHP');
  const [compareAmount, setCompareAmount] = useState('100000');
  const [compareResults, setCompareResults] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        exchangeRatesApi.getProviders(true),
        exchangeRatesApi.getStats(),
      ]);
      setProviders(p.data);
      setStats(s.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      const res = await exchangeRatesApi.getPresets();
      setPresets(res.data);
    } catch {}
  };

  const handleTabChange = (t: TabType) => {
    setTab(t);
    if (t === 'add') {
      loadPresets();
      resetForm();
      setEditProvider(null);
    }
    if (t === 'logs') loadAll();
  };

  const resetForm = () => {
    setForm({
      companyName: '', slug: '', logoUrl: '', country: 'KR',
      officialWebsite: '', appDeepLink: '', fetchMethod: 'MANUAL',
      scraperKey: '', sourceUrl: '', isVerified: false, isFeatured: false,
      priority: 50, transferTime: '', minAmount: '', maxAmount: '', notes: '',
      supportedSendCurrencies: ['KRW'], supportedRecvCurrencies: [],
    });
    setSelectedPreset(null);
    setPresetSearch('');
  };

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset);
    setForm((f) => ({
      ...f,
      companyName: preset.companyName,
      slug: preset.slug,
      country: preset.country,
      officialWebsite: preset.officialWebsite || '',
      appDeepLink: preset.appDeepLink || '',
      fetchMethod: preset.fetchMethod,
      scraperKey: preset.scraperKey || '',
      sourceUrl: preset.sourceUrl || '',
      transferTime: preset.transferTime || '',
      supportedSendCurrencies: preset.supportedSendCurrencies,
      supportedRecvCurrencies: preset.supportedRecvCurrencies,
      isVerified: preset.isVerified,
    }));
  };

  const startEdit = (p: Provider) => {
    setEditProvider(p);
    setForm({
      companyName: p.companyName,
      slug: p.slug,
      logoUrl: p.logoUrl || '',
      country: p.country,
      officialWebsite: (p as any).officialWebsite || '',
      appDeepLink: (p as any).appDeepLink || '',
      fetchMethod: p.fetchMethod,
      scraperKey: (p as any).scraperKey || '',
      sourceUrl: (p as any).sourceUrl || '',
      isVerified: p.isVerified,
      isFeatured: p.isFeatured,
      priority: (p as any).priority ?? 50,
      transferTime: p.transferTime || '',
      minAmount: (p as any).minAmount ?? '',
      maxAmount: (p as any).maxAmount ?? '',
      notes: (p as any).notes || '',
      supportedSendCurrencies: (p as any).supportedSendCurrencies || ['KRW'],
      supportedRecvCurrencies: (p as any).supportedRecvCurrencies || [],
    });
    setTab('add');
    loadPresets();
  };

  const handleSaveProvider = async () => {
    if (!form.companyName || !form.slug) {
      toast.error('Company name and slug are required');
      return;
    }
    setSavingForm(true);
    try {
      const payload = {
        ...form,
        minAmount: form.minAmount ? parseFloat(String(form.minAmount)) : undefined,
        maxAmount: form.maxAmount ? parseFloat(String(form.maxAmount)) : undefined,
        priority: Number(form.priority),
      };
      if (editProvider) {
        await exchangeRatesApi.updateProvider(editProvider.id, payload);
        toast.success('Provider updated!');
      } else {
        await exchangeRatesApi.createProvider(payload);
        toast.success('Provider added!');
      }
      await loadAll();
      setTab('providers');
      resetForm();
      setEditProvider(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this provider? All its rates will also be deleted.')) return;
    setDeletingId(id);
    try {
      await exchangeRatesApi.deleteProvider(id);
      toast.success('Provider deleted');
      setProviders((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFetch = async (id: string) => {
    setFetchingId(id);
    try {
      const res = await exchangeRatesApi.triggerFetch(id);
      toast.success(`Fetched! ${res.data.ratesUpdated} rates updated`);
      await loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Fetch failed');
    } finally {
      setFetchingId(null);
    }
  };

  const handleFetchAll = async () => {
    setFetchingId('all');
    try {
      await exchangeRatesApi.fetchAll();
      toast.success('Fetch-all triggered!');
      await loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Fetch-all failed');
    } finally {
      setFetchingId(null);
    }
  };

  const handleSaveRate = async () => {
    if (!rateForm.providerId || !rateForm.rate) {
      toast.error('Provider and rate are required');
      return;
    }
    setSavingRate(true);
    try {
      await exchangeRatesApi.setRate(rateForm.providerId, {
        sendCurrency: rateForm.sendCurrency,
        recvCurrency: rateForm.recvCurrency,
        rate: parseFloat(rateForm.rate),
        transferFee: rateForm.transferFee ? parseFloat(rateForm.transferFee) : 0,
      });
      toast.success('Rate saved!');
      setShowRateModal(false);
      await loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleCompare = async () => {
    setComparing(true);
    try {
      const res = await exchangeRatesApi.compare(compareSend, compareRecv, parseFloat(compareAmount) || undefined);
      setCompareResults(res.data);
    } catch (e: any) {
      toast.error('Compare failed');
    } finally {
      setComparing(false);
    }
  };

  const toggleCurrency = (currency: string, field: 'supportedSendCurrencies' | 'supportedRecvCurrencies') => {
    setForm((f) => {
      const current = f[field] as string[];
      return {
        ...f,
        [field]: current.includes(currency)
          ? current.filter((c) => c !== currency)
          : [...current, currency],
      };
    });
  };

  const filteredPresets = presets.filter((p) =>
    p.companyName.toLowerCase().includes(presetSearch.toLowerCase()) ||
    p.country.toLowerCase().includes(presetSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Exchange Rates
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage remittance companies and live exchange rates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFetchAll}
            disabled={fetchingId === 'all'}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingId === 'all' ? 'animate-spin' : ''}`} />
            Fetch All Rates
          </button>
          <button
            onClick={() => handleTabChange('add')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Providers', value: stats.totalProviders, icon: Globe, color: 'text-blue-600' },
            { label: 'Active Providers', value: stats.activeProviders, icon: CheckCircle, color: 'text-green-600' },
            { label: 'Total Rate Pairs', value: stats.totalRates, icon: TrendingUp, color: 'text-purple-600' },
            { label: 'Stale Rates', value: stats.staleRates, icon: AlertCircle, color: 'text-orange-600' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-20`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex gap-0">
            {[
              { id: 'providers', label: 'Providers', icon: Globe },
              { id: 'add', label: editProvider ? 'Edit Provider' : 'Add Provider', icon: Plus },
              { id: 'logs', label: 'Rate Logs', icon: BarChart2 },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id as TabType)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ── Providers Tab ──────────────────────────────────────── */}
          {tab === 'providers' && (
            <div className="space-y-4">
              {/* Compare Tool */}
              <div className="bg-gradient-to-r from-primary/5 to-blue-50 rounded-xl p-4 border border-primary/10">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Live Rate Comparison Tool
                </h3>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="form-label text-xs">Send</label>
                    <select className="form-input py-2 text-sm" value={compareSend} onChange={(e) => setCompareSend(e.target.value)}>
                      {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 mb-2" />
                  <div>
                    <label className="form-label text-xs">Receive</label>
                    <select className="form-input py-2 text-sm" value={compareRecv} onChange={(e) => setCompareRecv(e.target.value)}>
                      {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Amount</label>
                    <input
                      type="number"
                      className="form-input py-2 text-sm w-36"
                      value={compareAmount}
                      onChange={(e) => setCompareAmount(e.target.value)}
                      placeholder="100000"
                    />
                  </div>
                  <button
                    onClick={handleCompare}
                    disabled={comparing}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                  >
                    {comparing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                    Compare
                  </button>
                </div>

                {compareResults && (
                  <div className="mt-4 space-y-2">
                    {compareResults.results?.length === 0 ? (
                      <p className="text-sm text-gray-500">No rates found for this pair. Add rates manually or trigger auto-fetch.</p>
                    ) : (
                      compareResults.results?.map((r: any, i: number) => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
                            i === 0 ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {i === 0 && <Star className="w-4 h-4 text-yellow-500" />}
                            <span className="font-semibold">{r.provider.companyName}</span>
                            <span className="text-xs text-gray-400">{r.rateSource}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{r.rate.toFixed(4)} {compareRecv}</div>
                            {r.receivedAmount && (
                              <div className="text-xs text-gray-500">
                                You get: {r.receivedAmount.toLocaleString()} {compareRecv}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Providers List */}
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading providers…</div>
              ) : providers.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">No providers yet.</p>
                  <button onClick={() => handleTabChange('add')} className="btn-primary mt-3 text-sm">
                    Add First Provider
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((p) => (
                    <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {p.logoUrl ? (
                            <img src={p.logoUrl} alt={p.companyName} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100 p-1" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-bold text-xs">{p.companyName[0]}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{p.companyName}</span>
                              {p.isVerified && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                              {p.isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}>{p.status}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${FETCH_METHOD_COLORS[p.fetchMethod] || 'bg-gray-100 text-gray-600'}`}>
                                {FETCH_METHOD_LABELS[p.fetchMethod] || p.fetchMethod}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{p.country}</span>
                              {p.transferTime && <><span>·</span><Clock className="w-3 h-3" /><span>{p.transferTime}</span></>}
                              <span>·</span>
                              <span>{p.rates.length} rate pairs</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setRateForm((f) => ({ ...f, providerId: p.id }));
                              setShowRateModal(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary"
                            title="Add Rate"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {p.fetchMethod !== 'MANUAL' && (
                            <button
                              onClick={() => handleFetch(p.id)}
                              disabled={fetchingId === p.id}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Fetch Rates"
                            >
                              <RefreshCw className={`w-4 h-4 ${fetchingId === p.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Rates quick view */}
                      {p.rates.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {p.rates.slice(0, 8).map((r) => (
                            <span
                              key={r.id}
                              className={`text-xs px-2 py-1 rounded-lg ${r.isStale ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-600'}`}
                            >
                              {r.sendCurrency}→{r.recvCurrency}: <b>{r.rate.toFixed(4)}</b>
                              {r.isStale && ' ⚠️'}
                            </span>
                          ))}
                          {p.rates.length > 8 && (
                            <span className="text-xs text-gray-400 py-1">+{p.rates.length - 8} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Add / Edit Provider Tab ───────────────────────────── */}
          {tab === 'add' && (
            <div className="max-w-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {editProvider ? `Edit: ${editProvider.companyName}` : 'Add New Provider'}
                </h2>
                {editProvider && (
                  <button
                    onClick={() => { setEditProvider(null); resetForm(); }}
                    className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Clear / New
                  </button>
                )}
              </div>

              {/* Preset Picker */}
              {!editProvider && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    🏢 Quick-add from preset companies
                  </h3>
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="form-input pl-9 py-2 text-sm"
                      placeholder="Search Wise, GME, Sentbe..."
                      value={presetSearch}
                      onChange={(e) => setPresetSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                    {filteredPresets.map((preset) => (
                      <button
                        key={preset.slug}
                        onClick={() => applyPreset(preset)}
                        className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                          selectedPreset?.slug === preset.slug
                            ? 'border-primary bg-primary/5 text-primary font-semibold'
                            : 'border-gray-200 bg-white hover:border-primary/40 text-gray-700'
                        }`}
                      >
                        <div className="font-medium truncate">{preset.companyName}</div>
                        <div className="text-xs text-gray-400">{preset.country} · {preset.fetchMethod}</div>
                      </button>
                    ))}
                  </div>
                  {selectedPreset && (
                    <p className="text-xs text-blue-700 mt-2">
                      ✅ Preset applied — review and save below, or customize the fields.
                    </p>
                  )}
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Company Name *</label>
                  <input
                    className="form-input"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Gmoney Korea"
                  />
                </div>
                <div>
                  <label className="form-label">Slug *</label>
                  <input
                    className="form-input font-mono text-sm"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="gmoney-korea"
                  />
                </div>
                <div>
                  <label className="form-label">Country Code</label>
                  <input
                    className="form-input"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                    placeholder="KR"
                    maxLength={2}
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Official Website</label>
                  <input
                    className="form-input"
                    type="url"
                    value={form.officialWebsite}
                    onChange={(e) => setForm({ ...form, officialWebsite: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="form-label">App Deep Link (optional)</label>
                  <input
                    className="form-input"
                    value={form.appDeepLink}
                    onChange={(e) => setForm({ ...form, appDeepLink: e.target.value })}
                    placeholder="wise://... or https://app.wise.com"
                  />
                </div>
                <div>
                  <label className="form-label">Logo URL (optional)</label>
                  <input
                    className="form-input"
                    type="url"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="form-label">Transfer Time</label>
                  <input
                    className="form-input"
                    value={form.transferTime}
                    onChange={(e) => setForm({ ...form, transferTime: e.target.value })}
                    placeholder="Same day, 1-2 hrs..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="form-label">Rate Fetch Method</label>
                  <select
                    className="form-input"
                    value={form.fetchMethod}
                    onChange={(e) => setForm({ ...form, fetchMethod: e.target.value })}
                  >
                    {Object.entries(FETCH_METHOD_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Manual = enter rates yourself · Forex API = free mid-market · Wise API = Wise live rates · HTML Scraper = parse static page · <span className="text-green-600 font-medium">Live Scraper = actual company rate (GME, Sentbe supported)</span>
                  </p>
                </div>

                {form.fetchMethod === 'HTML_SCRAPER' && (
                  <div className="col-span-2">
                    <label className="form-label">Scraper Source URL</label>
                    <input
                      className="form-input"
                      type="url"
                      value={form.sourceUrl}
                      onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                      placeholder="https://company.com/rates"
                    />
                  </div>
                )}

                {form.fetchMethod === 'BROWSER_SCRAPER' && (
                  <div className="col-span-2">
                    <label className="form-label">Scraper Key</label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.scraperKey}
                      onChange={(e) => setForm({ ...form, scraperKey: e.target.value })}
                      placeholder="e.g. gme-remit, sentbe (matches company slug)"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave blank to use slug. Supported: gme-remit, sentbe, hanpass, jrf, e9pay, hibiki, narabi</p>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="form-label">Supported Send Currencies</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCurrency(c, 'supportedSendCurrencies')}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.supportedSendCurrencies.includes(c)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="form-label">Supported Receive Currencies</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCurrency(c, 'supportedRecvCurrencies')}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          form.supportedRecvCurrencies.includes(c)
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label">Min Transfer (KRW)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.minAmount}
                    onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="form-label">Max Transfer (KRW)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.maxAmount}
                    onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                    placeholder="5000000"
                  />
                </div>

                <div>
                  <label className="form-label">Display Priority (lower = higher)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
                    min={1} max={100}
                  />
                </div>


                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isVerified}
                      onChange={(e) => setForm({ ...form, isVerified: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Verified ✓</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Featured ★</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="form-label">Notes (internal)</label>
                  <textarea
                    className="form-input min-h-[60px]"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Internal notes about this provider..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveProvider} disabled={savingForm} className="btn-primary flex items-center gap-2">
                  {savingForm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {editProvider ? 'Save Changes' : 'Add Provider'}
                </button>
                <button
                  onClick={() => { setTab('providers'); resetForm(); setEditProvider(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Rate Logs Tab ─────────────────────────────────────── */}
          {tab === 'logs' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Update Logs</h2>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Loading logs…</div>
              ) : stats?.recentLogs?.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No logs yet. Trigger a fetch to see logs.</div>
              ) : (
                <div className="space-y-2">
                  {stats?.recentLogs?.map((log: any) => {
                    const provider = providers.find((p) => p.id === log.providerId);
                    return (
                      <div
                        key={log.id}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border ${
                          log.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {log.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-medium">{provider?.companyName ?? log.providerId}</span>
                            <span className="text-gray-400 mx-2">·</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${FETCH_METHOD_COLORS[log.fetchMethod] || ''}`}>
                              {log.fetchMethod}
                            </span>
                            {log.errorMessage && (
                              <span className="ml-2 text-red-600 text-xs">{log.errorMessage}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-400">
                          <div>{log.ratesUpdated} rates · {log.duration}ms</div>
                          <div>{new Date(log.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rate Entry Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Add / Update Rate</h2>
              <button onClick={() => setShowRateModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Provider</label>
                <select
                  className="form-input"
                  value={rateForm.providerId}
                  onChange={(e) => setRateForm({ ...rateForm, providerId: e.target.value })}
                >
                  <option value="">Select provider...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Send Currency</label>
                  <select
                    className="form-input"
                    value={rateForm.sendCurrency}
                    onChange={(e) => setRateForm({ ...rateForm, sendCurrency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Receive Currency</label>
                  <select
                    className="form-input"
                    value={rateForm.recvCurrency}
                    onChange={(e) => setRateForm({ ...rateForm, recvCurrency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Rate (1 {rateForm.sendCurrency} = ? {rateForm.recvCurrency})
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={rateForm.rate}
                  onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                  placeholder="e.g. 0.0385 for KRW→PHP"
                />
              </div>

              <div>
                <label className="form-label">Transfer Fee ({rateForm.sendCurrency})</label>
                <input
                  type="number"
                  className="form-input"
                  value={rateForm.transferFee}
                  onChange={(e) => setRateForm({ ...rateForm, transferFee: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSaveRate} disabled={savingRate} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {savingRate ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Rate
              </button>
              <button onClick={() => setShowRateModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
