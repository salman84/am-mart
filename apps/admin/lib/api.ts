import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const adminApi = {
  login: (data: any) => api.post('/auth/login', data),
  getDashboard: () => api.get('/admin/dashboard'),
  getSettings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: string) => api.put('/admin/settings', { key, value }),
  getLogs: (params?: any) => api.get('/admin/logs', { params }),
};

export const uploadApi = {
  uploadImage: (file: File, folder = 'general') => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    return api.post('/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  create: (data: any) => api.post('/users', data),
  updateStatus: (id: string, status: string) => api.put(`/users/${id}/status`, { status }),
};

export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string, notes?: string) => api.post(`/orders/${id}/status`, { status, notes }),
};

export const simApi = {
  addNumber: (data: any) => api.post('/sim/admin/numbers', data),
  getOrders: (params?: any) => api.get('/sim/admin/orders', { params }),
  updateOrderStatus: (id: string, status: string, notes?: string) =>
    api.post(`/sim/admin/orders/${id}/status`, { status, notes }),
};

export const topupApi = {
  getOrders: (params?: any) => api.get('/topup/admin/orders', { params }),
};

export const sellersApi = {
  getAll: (params?: any) => api.get('/sellers/admin', { params }),
  updateStatus: (id: string, status: string, reason?: string) =>
    api.post(`/sellers/${id}/status`, { status, reason }),
};

export const ridersApi = {
  getAll: (params?: any) => api.get('/riders', { params }),
};

export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const categoriesApi = {
  getAll: () => api.get('/categories?includeInactive=true'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const paymentsApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getRefunds: (params?: any) => api.get('/payments/refunds', { params }),
  processRefund: (id: string, approved: boolean, notes?: string) =>
    api.post(`/payments/refunds/${id}/process`, { approved, notes }),
  getPayouts: (params?: any) => api.get('/payments/payouts', { params }),
};

export const notificationsApi = {
  sendToAll: (data: any) => api.post('/notifications/send-all', data),
};

export const supportApi = {
  getAll: (params?: any) => api.get('/support/tickets', { params }),
  updateStatus: (id: string, status: string) => api.put(`/support/tickets/${id}/status`, { status }),
  reply: (id: string, message: string) => api.post(`/support/tickets/${id}/reply-admin`, { message }),
};

export const bannersApi = {
  getAll: () => api.get('/banners/all'),
  create: (data: any) => api.post('/banners', data),
  update: (id: string, data: any) => api.put(`/banners/${id}`, data),
  delete: (id: string) => api.delete(`/banners/${id}`),
};

export const couponsApi = {
  getAll: () => api.get('/coupons'),
  create: (data: any) => api.post('/coupons', data),
  update: (id: string, data: any) => api.put(`/coupons/${id}`, data),
  delete: (id: string) => api.delete(`/coupons/${id}`),
};

export const deliveryApi = {
  getAvailableRiders: () => api.get('/delivery/riders/available'),
  assignRider: (orderId: string, riderId: string) => api.post('/delivery/assign', { orderId, riderId }),
};

export const reportsApi = {
  get: (period: string) => api.get(`/admin/reports?period=${period}`),
};

export const backupApi = {
  exportData: () => api.post('/admin/backup'),
};

export const reviewsApi = {
  getAll: (params?: any) => api.get('/reviews/admin', { params }),
  toggleApproval: (id: string, approved: boolean) => api.patch(`/reviews/${id}/approve`, { approved }),
};

export const deliveryZonesApi = {
  getAll: () => api.get('/admin/delivery-zones'),
  create: (data: any) => api.post('/admin/delivery-zones', data),
  update: (id: string, data: any) => api.put(`/admin/delivery-zones/${id}`, data),
  delete: (id: string) => api.delete(`/admin/delivery-zones/${id}`),
};

export const marketplaceConfigApi = {
  getOverview: () => api.get('/marketplace-config/admin/overview'),
  getSettings: (group?: string) => api.get('/marketplace-config/admin/settings', { params: { group } }),
  updateSetting: (key: string, data: any) => api.put(`/marketplace-config/admin/settings/${key}`, data),
  getSellerFormFields: (lang = 'en') => api.get('/marketplace-config/admin/seller-form-fields', { params: { lang } }),
  createSellerFormField: (data: any) => api.post('/marketplace-config/admin/seller-form-fields', data),
  updateSellerFormField: (id: string, data: any) => api.put(`/marketplace-config/admin/seller-form-fields/${id}`, data),
  getDocumentRequirements: (lang = 'en') => api.get('/marketplace-config/admin/document-requirements', { params: { lang } }),
  createDocumentRequirement: (data: any) => api.post('/marketplace-config/admin/document-requirements', data),
  updateDocumentRequirement: (id: string, data: any) => api.put(`/marketplace-config/admin/document-requirements/${id}`, data),
  getHomepageSections: (lang = 'en') => api.get('/marketplace-config/admin/homepage-sections', { params: { lang } }),
  createHomepageSection: (data: any) => api.post('/marketplace-config/admin/homepage-sections', data),
  updateHomepageSection: (id: string, data: any) => api.put(`/marketplace-config/admin/homepage-sections/${id}`, data),
  deleteHomepageSection: (id: string) => api.delete(`/marketplace-config/admin/homepage-sections/${id}`),
  getPolicyPages: (lang = 'en') => api.get('/marketplace-config/admin/policy-pages', { params: { lang } }),
  createPolicyPage: (data: any) => api.post('/marketplace-config/admin/policy-pages', data),
  updatePolicyPage: (id: string, data: any) => api.put(`/marketplace-config/admin/policy-pages/${id}`, data),
  getTranslations: (lang = 'en') => api.get('/marketplace-config/admin/translations', { params: { lang } }),
  updateTranslation: (key: string, data: any) => api.put(`/marketplace-config/admin/translations/${encodeURIComponent(key)}`, data),
  getPaymentProviders: () => api.get('/marketplace-config/admin/payment-providers'),
  updatePaymentProvider: (id: string, data: any) => api.put(`/marketplace-config/admin/payment-providers/${id}`, data),
  getShippingMethods: () => api.get('/marketplace-config/admin/shipping-methods'),
  createShippingMethod: (data: any) => api.post('/marketplace-config/admin/shipping-methods', data),
  updateShippingMethod: (id: string, data: any) => api.put(`/marketplace-config/admin/shipping-methods/${id}`, data),
  getCommissionRules: () => api.get('/marketplace-config/admin/commission-rules'),
  createCommissionRule: (data: any) => api.post('/marketplace-config/admin/commission-rules', data),
  updateCommissionRule: (id: string, data: any) => api.put(`/marketplace-config/admin/commission-rules/${id}`, data),
};

export const exchangeRatesApi = {
  // Admin
  getStats: () => api.get('/exchange-rates/admin/stats'),
  getProviders: (includeInactive = false) =>
    api.get(`/exchange-rates/admin/providers?includeInactive=${includeInactive}`),
  getProvider: (id: string) => api.get(`/exchange-rates/admin/providers/${id}`),
  getPresets: () => api.get('/exchange-rates/admin/presets'),
  createProvider: (data: any) => api.post('/exchange-rates/admin/providers', data),
  updateProvider: (id: string, data: any) => api.put(`/exchange-rates/admin/providers/${id}`, data),
  deleteProvider: (id: string) => api.delete(`/exchange-rates/admin/providers/${id}`),
  setRate: (providerId: string, data: any) => api.post(`/exchange-rates/admin/providers/${providerId}/rate`, data),
  triggerFetch: (providerId: string) => api.post(`/exchange-rates/admin/providers/${providerId}/fetch`),
  fetchAll: () => api.post('/exchange-rates/admin/fetch-all'),
  compare: (send: string, recv: string, amount?: number) =>
    api.get(`/exchange-rates/admin/compare?send=${send}&recv=${recv}${amount ? `&amount=${amount}` : ''}`),
  // Public
  publicCompare: (send: string, recv: string, amount?: number) =>
    api.get(`/exchange-rates/public/compare?send=${send}&recv=${recv}${amount ? `&amount=${amount}` : ''}`),
  getCurrencies: () => api.get('/exchange-rates/public/currencies'),
};

export default api;
