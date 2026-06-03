import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── 1. IN-MEMORY TOKEN CACHE ────────────────────────────────────────────────
// SecureStore is encrypted disk I/O (50-200 ms each call).
// Caching in memory means only the FIRST request reads from disk.
// Every subsequent request is instant (<1 ms).
let _cachedToken: string | null = undefined as any; // undefined = not yet loaded

export function setCachedToken(token: string | null) {
  _cachedToken = token;
}


async function getToken(): Promise<string | null> {
  if (_cachedToken !== undefined) return _cachedToken;   // fast path — memory hit
  _cachedToken = await SecureStore.getItemAsync('accessToken'); // slow path — disk, once only
  return _cachedToken;
}

// ─── 2. IN-MEMORY RESPONSE CACHE ─────────────────────────────────────────────
// Avoids re-fetching the same GET data on every navigation.
// TTL = 5 min for most endpoints; settings = 10 min.
interface CacheEntry { data: any; expiresAt: number }
const _cache = new Map<string, CacheEntry>();

function cacheGet(key: string): any | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key: string, data: any, ttlMs: number) {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearApiCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return; }
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

const TTL = {
  settings:   30 * 1000,  // 30 sec — auto-refresh picks up admin changes fast
  products:   30 * 1000,
  categories: 30 * 1000,
  banners:    30 * 1000,
  sim:        30 * 1000,
};

// ─── 3. AXIOS INSTANCE ───────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,              // reduced from 30 s — fail fast, don't freeze UI
  headers: { 'Content-Type': 'application/json' },
});

// Request: attach cached token — NO disk I/O after first request
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: handle 401 + token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          await SecureStore.setItemAsync('accessToken', accessToken);
          // Always save the new refresh token — backend uses rotating tokens
          if (newRefreshToken) {
            await SecureStore.setItemAsync('refreshToken', newRefreshToken);
          }
          setCachedToken(accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          // Refresh failed — fall through to force logout
        }
      }
      // No refresh token OR refresh failed — clear stale tokens silently, stay on screen
      setCachedToken(null);
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    }
    return Promise.reject(error);
  },
);

// ─── 4. CACHED GET HELPER ────────────────────────────────────────────────────
async function cachedGet(url: string, ttlMs: number, params?: any) {
  const key = url + (params ? JSON.stringify(params) : '');
  const hit = cacheGet(key);
  if (hit) return { data: hit, _fromCache: true };
  const res = await api.get(url, params ? { params } : undefined);
  cacheSet(key, res.data, ttlMs);
  return res;
}

// ─── 5. API MODULES ──────────────────────────────────────────────────────────

export const authApi = {
  register:      (data: any) => api.post('/auth/register', data),
  login:         (data: any) => api.post('/auth/login', data),
  verifyPhone:   (data: any) => api.post('/auth/verify-phone', data),
  loginWithOtp:  (data: any) => api.post('/auth/login/otp/verify', data),
  sendOtp:       (phone: string) => api.post('/auth/login/otp/send', { phone }),
  refresh:       (token: string) => api.post('/auth/refresh', { refreshToken: token }),
  logout:        () => api.post('/auth/logout'),
  forgotPassword:(phone: string) => api.post('/auth/forgot-password', { phone }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
};

export const userApi = {
  getProfile:    () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  updateFcmToken:(fcmToken: string) => api.put('/users/me/fcm-token', { fcmToken }),
  getAddresses:  () => api.get('/users/me/addresses'),
  addAddress:    (data: any) => api.post('/users/me/addresses', data),
  updateAddress: (id: string, data: any) => api.put(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/me/addresses/${id}`),
};

export const productApi = {
  getAll:         (params?: any) => cachedGet('/products', TTL.products, params),
  getOne:         (id: string) => api.get(`/products/${id}`),
  getRelated:     (id: string) => api.get(`/products/${id}/related`),
  getFeatured:    () => cachedGet('/products/featured', TTL.products),
  getPopular:     () => cachedGet('/products/popular', TTL.products),
  getWishlist:    () => api.get('/products/wishlist'),
  toggleWishlist: (id: string) => { clearApiCache('/products'); return api.post(`/products/${id}/wishlist`); },
  create:         (data: any) => { clearApiCache('/products'); return api.post('/products', data); },
  update:         (id: string, data: any) => { clearApiCache('/products'); return api.put(`/products/${id}`, data); },
  delete:         (id: string) => { clearApiCache('/products'); return api.delete(`/products/${id}`); },
  setVisibility:  (id: string, visible: boolean) => { clearApiCache('/products'); return api.patch(`/products/${id}/visibility`, { visible }); },
  adminVisibility:(id: string, visible: boolean, reason?: string) => { clearApiCache('/products'); return api.put(`/products/${id}/admin-visibility`, { visible, reason }); },
};

export const categoryApi = {
  getAll: () => cachedGet('/categories', TTL.categories),
};

export const orderApi = {
  getCart:        () => api.get('/orders/cart'),
  addToCart:      (productId: string, quantity: number) => api.post('/orders/cart/add', { productId, quantity }),
  updateCartItem: (itemId: string, quantity: number) => api.put(`/orders/cart/${itemId}`, { quantity }),
  clearCart:      () => api.post('/orders/cart/clear'),
  create:         (data: any) => api.post('/orders', data),
  createOrder:    (data: any) => api.post('/orders', data),
  getMyOrders:    (params?: any) => api.get('/orders/my', { params }),
  getOne:         (id: string) => api.get(`/orders/${id}`),
  getOrder:       (id: string) => api.get(`/orders/${id}`),
  cancelOrder:    (id: string, reason?: string) => api.post(`/orders/${id}/cancel`, { reason }),
};

export const cartApi = {
  getCart:    () => api.get('/orders/cart'),
  addItem:    (data: any) => api.post('/orders/cart/add', data),
  updateItem: (itemId: string, quantity: number) => api.put(`/orders/cart/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/orders/cart/${itemId}`),
  clear:      () => api.post('/orders/cart/clear'),
};

export const simApi = {
  search:      (lastFour: string, carrier?: string, simType?: string) =>
    cachedGet('/sim/search', TTL.sim, { lastFour, carrier, simType }),
  getAvailable:(params?: any) => cachedGet('/sim/available', TTL.sim, params),
  reserve:     (id: string, chosenLastFour?: string) => {
    clearApiCache('/sim/available');
    return api.post(`/sim/${id}/reserve`, chosenLastFour ? { chosenLastFour } : {});
  },
  submitOrder: (orderId: string, data: any) => api.post(`/sim/orders/${orderId}/submit`, data),
  getMyOrders: (params?: any) => api.get('/sim/orders/my', { params }),
  getOrder:    (id: string) => api.get(`/sim/orders/${id}`),
};

export const topupApi = {
  getCountries: () => cachedGet('/topup/countries', TTL.products),
  getAmounts:   (country: string, operator: string) =>
    cachedGet('/topup/amounts', TTL.products, { country, operator }),
  createOrder:  (data: any) => api.post('/topup/order', data),
  processOrder: (id: string) => api.post(`/topup/order/${id}/process`),
  getMyOrders:  (params?: any) => api.get('/topup/my-orders', { params }),
};

export const notificationApi = {
  getAll:      (params?: any) => api.get('/notifications', { params }),
  markRead:    (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const sellerApi = {
  apply:             (data: any) => api.post('/sellers/apply', data),
  getProfile:        () => api.get('/sellers/profile'),
  updateProfile:     (data: any) => api.put('/sellers/profile', data),
  getDashboard:      () => api.get('/sellers/dashboard'),
  getOrders:         (params?: any) => api.get('/sellers/orders', { params }),
  updateOrderStatus: (id: string, status: string) => api.post(`/sellers/orders/${id}/status`, { status }),
  getMyProducts:     (params?: any) => api.get('/products?mine=true', { params }),
  createProduct:     (data: any) => api.post('/products', data),
  updateProduct:     (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct:     (id: string) => api.delete(`/products/${id}`),
  getEarnings:       () => api.get('/sellers/earnings'),
  getPayouts:        (params?: any) => api.get('/sellers/payouts', { params }),
};

// ── Seller Warehouse Integration ─────────────────────────────────────────────
export const sellerWarehouseApi = {
  getTransfers:     (params?: any) => api.get('/warehouse/transfers', { params }),
  getTransfer:      (id: string) => api.get(`/warehouse/transfers/${id}`),
  createTransfer:   (data: any) => api.post('/warehouse/transfers', data),
  getCenters:       () => api.get('/warehouse/centers', { params: { isActive: 'true', limit: 100 } }),
};

export const uploadApi = {
  uploadImage: (formData: FormData) =>
    api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const riderApi = {
  register:            (data: any) => api.post('/riders/register', data),
  getProfile:          () => api.get('/riders/profile'),
  updateOnlineStatus:  (isOnline: boolean, lat?: number, lng?: number) =>
    api.put('/riders/online-status', { isOnline, lat, lng }),
  getAssignments:      (status?: string) => api.get('/delivery/rider/assignments', { params: { status } }),
  updateDeliveryStatus:(id: string, status: string, data?: any) =>
    api.post(`/delivery/assignments/${id}/status`, { status, ...data }),
  getEarnings:         () => api.get('/delivery/rider/earnings'),
};

// ── Parcel Delivery (Driver) ─────────────────────────────────────────────────
export const driverRouteApi = {
  getMyRoutes:         (params?: any) => api.get('/routes', { params }),
  getRoute:            (id: string) => api.get(`/routes/${id}`),
  updateRouteStatus:   (id: string, status: string) => api.post(`/routes/${id}/status`, { status }),
  updateStopStatus:    (stopId: string, status: string) => api.post(`/routes/stops/${stopId}/status`, { status }),
  submitDeliveryProof: (data: any) => api.post('/routes/delivery-proof', data),
  recordFailedDelivery:(data: any) => api.post('/routes/failed-delivery', data),
  // Shifts
  getMyShiftAssignments: (params?: any) => api.get('/routes/shift-assignments', { params }),
  clockIn:             (id: string) => api.post(`/routes/shift-assignments/${id}/status`, { status: 'CLOCKED_IN' }),
  clockOut:            (id: string) => api.post(`/routes/shift-assignments/${id}/status`, { status: 'CLOCKED_OUT' }),
};

export const driverPackageApi = {
  getPackage:          (id: string) => api.get(`/packages/${id}`),
  trackPackage:        (trackingNumber: string) => api.get(`/packages/track/${trackingNumber}`),
  addScan:             (id: string, data: any) => api.post(`/packages/${id}/scan`, data),
  updateStatus:        (id: string, status: string) => api.post(`/packages/${id}/status`, { status }),
};

// ── Customer Package Tracking ────────────────────────────────────────────────
export const customerTrackingApi = {
  trackPackage:      (trackingNumber: string) => api.get(`/packages/track/${trackingNumber}`),
  getDeliveryProof:  (packageId: string) => api.get(`/routes/delivery-proof/${packageId}`),
  getTimeSlots:      () => api.get('/routes/time-slots'),
};

export const walletApi = {
  getBalance:     () => api.get('/wallet/balance'),
  getTransactions:(params?: any) => api.get('/wallet/transactions', { params }),
};

export const bannerApi = {
  getActive: () => cachedGet('/banners', TTL.banners),
};

export const supportApi = {
  createTicket:  (data: any) => api.post('/support/tickets', data),
  getMyTickets:  () => api.get('/support/tickets/my'),
  replyToTicket: (id: string, message: string) => api.post(`/support/tickets/${id}/reply`, { message }),
};

export const couponApi = {
  validate: (code: string, amount: number) => api.post('/coupons/validate', { code, amount }),
  validateAuth: (code: string, amount: number) => api.post('/coupons/validate-auth', { code, amount }),
  getMyCoupons: () => api.get('/coupons/my-coupons'),
  getReferralStats: () => api.get('/coupons/referral-stats'),
};

export const referralApi = {
  getStats: () => api.get('/coupons/referral-stats'),
};

export const appSettingsApi = {
  getPublic: () => cachedGet('/admin/public-settings', TTL.settings),
};

export const reviewsApi = {
  create:            (data: any) => api.post('/reviews', data),
  getProductReviews: (productId: string, params?: any) =>
    api.get(`/reviews/product/${productId}`, { params }),
  getMyReviews:      () => api.get('/reviews/my'),
};

export const exchangeRateApi = {
  compare:      (send: string, recv: string, amount?: number) =>
    cachedGet(`/exchange-rates/public/compare`, TTL.products, { send, recv, amount }),
  getBestRates: (base = 'KRW') =>
    cachedGet(`/exchange-rates/public/best`, TTL.products, { base }),
  getCurrencies:() => cachedGet('/exchange-rates/public/currencies', TTL.settings),
};

export default api;
