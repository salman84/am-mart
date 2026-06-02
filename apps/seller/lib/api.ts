import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1' });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sellerToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerUser');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data: { identifier: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
};

export const sellerApi = {
  getProfile: () => api.get('/sellers/profile'),
  updateProfile: (data: any) => api.put('/sellers/profile', data),
  getDashboard: () => api.get('/sellers/dashboard'),
  getOrders: (params?: any) => api.get('/sellers/orders', { params }),
  updateOrderStatus: (id: string, status: string) => api.post(`/sellers/orders/${id}/status`, { status }),
  getMyProducts: (params?: any) => api.get('/products', { params: { mine: true, ...params } }),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
  getEarnings: () => api.get('/sellers/earnings'),
};

export const categoriesApi = {
  getAll: () => api.get('/categories'),
};

export const uploadApi = {
  uploadImage: (file: File, folder = 'products') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadDocument: (file: File, folder = 'seller-documents') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return api.post('/upload/document', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;
