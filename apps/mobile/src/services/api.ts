import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data;
          await SecureStore.setItemAsync('accessToken', accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        }
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  verifyPhone: (data: any) => api.post('/auth/verify-phone', data),
  loginWithOtp: (data: any) => api.post('/auth/login/otp/verify', data),
  sendOtp: (phone: string) => api.post('/auth/login/otp/send', { phone }),
  refresh: (token: string) => api.post('/auth/refresh', { refreshToken: token }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (phone: string) => api.post('/auth/forgot-password', { phone }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  updateFcmToken: (fcmToken: string) => api.put('/users/me/fcm-token', { fcmToken }),
  getAddresses: () => api.get('/users/me/addresses'),
  addAddress: (data: any) => api.post('/users/me/addresses', data),
  updateAddress: (id: string, data: any) => api.put(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/users/me/addresses/${id}`),
};

export const productApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getOne: (id: string) => api.get(`/products/${id}`),
  getFeatured: () => api.get('/products/featured'),
  getPopular: () => api.get('/products/popular'),
  getWishlist: () => api.get('/products/wishlist'),
  toggleWishlist: (id: string) => api.post(`/products/${id}/wishlist`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const categoryApi = {
  getAll: () => api.get('/categories'),
};

export const orderApi = {
  getCart: () => api.get('/orders/cart'),
  addToCart: (productId: string, quantity: number) => api.post('/orders/cart/add', { productId, quantity }),
  updateCartItem: (itemId: string, quantity: number) => api.put(`/orders/cart/${itemId}`, { quantity }),
  clearCart: () => api.post('/orders/cart/clear'),
  create: (data: any) => api.post('/orders', data),
  createOrder: (data: any) => api.post('/orders', data),
  getMyOrders: (params?: any) => api.get('/orders/my', { params }),
  getOne: (id: string) => api.get(`/orders/${id}`),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  cancelOrder: (id: string, reason?: string) => api.post(`/orders/${id}/cancel`, { reason }),
};

export const cartApi = {
  getCart: () => api.get('/orders/cart'),
  addItem: (data: any) => api.post('/orders/cart/add', data),
  updateItem: (itemId: string, quantity: number) => api.put(`/orders/cart/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/orders/cart/${itemId}`),
  clear: () => api.post('/orders/cart/clear'),
};

export const simApi = {
  search: (lastFour: string, carrier?: string, simType?: string) =>
    api.get('/sim/search', { params: { lastFour, carrier, simType } }),
  getAvailable: (params?: any) => api.get('/sim/available', { params }),
  reserve: (id: string) => api.post(`/sim/${id}/reserve`),
  submitOrder: (orderId: string, data: any) => api.post(`/sim/orders/${orderId}/submit`, data),
  getMyOrders: (params?: any) => api.get('/sim/orders/my', { params }),
  getOrder: (id: string) => api.get(`/sim/orders/${id}`),
};

export const topupApi = {
  getCountries: () => api.get('/topup/countries'),
  getAmounts: (country: string, operator: string) => api.get('/topup/amounts', { params: { country, operator } }),
  createOrder: (data: any) => api.post('/topup/order', data),
  processOrder: (id: string) => api.post(`/topup/order/${id}/process`),
  getMyOrders: (params?: any) => api.get('/topup/my-orders', { params }),
};

export const notificationApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const sellerApi = {
  apply: (data: any) => api.post('/sellers/apply', data),
  getProfile: () => api.get('/sellers/profile'),
  updateProfile: (data: any) => api.put('/sellers/profile', data),
  getDashboard: () => api.get('/sellers/dashboard'),
  getOrders: (params?: any) => api.get('/sellers/orders', { params }),
  updateOrderStatus: (id: string, status: string) => api.post(`/sellers/orders/${id}/status`, { status }),
  getMyProducts: (params?: any) => api.get('/products?mine=true', { params }),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  getEarnings: () => api.get('/sellers/earnings'),
  getPayouts: (params?: any) => api.get('/sellers/payouts', { params }),
};

export const uploadApi = {
  uploadImage: (formData: FormData) =>
    api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const riderApi = {
  register: (data: any) => api.post('/riders/register', data),
  getProfile: () => api.get('/riders/profile'),
  updateOnlineStatus: (isOnline: boolean, lat?: number, lng?: number) =>
    api.put('/riders/online-status', { isOnline, lat, lng }),
  getAssignments: (status?: string) => api.get('/delivery/rider/assignments', { params: { status } }),
  updateDeliveryStatus: (id: string, status: string, data?: any) =>
    api.post(`/delivery/assignments/${id}/status`, { status, ...data }),
  getEarnings: () => api.get('/delivery/rider/earnings'),
};

export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params?: any) => api.get('/wallet/transactions', { params }),
};

export const bannerApi = {
  getActive: () => api.get('/banners'),
};

export const supportApi = {
  createTicket: (data: any) => api.post('/support/tickets', data),
  getMyTickets: () => api.get('/support/tickets/my'),
  replyToTicket: (id: string, message: string) => api.post(`/support/tickets/${id}/reply`, { message }),
};

export const couponApi = {
  validate: (code: string, amount: number) => api.post('/coupons/validate', { code, amount }),
};

export const appSettingsApi = {
  getPublic: () => api.get('/admin/public-settings'),
};

export const reviewsApi = {
  create: (data: any) => api.post('/reviews', data),
  getProductReviews: (productId: string, params?: any) => api.get(`/reviews/product/${productId}`, { params }),
  getMyReviews: () => api.get('/reviews/my'),
};

export const exchangeRateApi = {
  compare: (send: string, recv: string, amount?: number) =>
    api.get(`/exchange-rates/public/compare?send=${send}&recv=${recv}${amount ? `&amount=${amount}` : ''}`),
  getBestRates: (base = 'KRW') =>
    api.get(`/exchange-rates/public/best?base=${base}`),
  getCurrencies: () =>
    api.get('/exchange-rates/public/currencies'),
};

export default api;
