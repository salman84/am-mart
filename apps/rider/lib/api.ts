import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1' });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('riderToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('riderToken');
      localStorage.removeItem('riderUser');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data: { identifier: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
};

export const riderApi = {
  register: (data: any) => api.post('/riders/register', data),
  getProfile: () => api.get('/riders/profile'),
  updateOnlineStatus: (isOnline: boolean, lat?: number, lng?: number) =>
    api.put('/riders/online-status', { isOnline, lat, lng }),
  updateFcmToken: (fcmToken: string) => api.put('/riders/fcm-token', { fcmToken }),
};

export const uploadApi = {
  uploadDocument: (file: File, folder = 'rider-documents') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return api.post('/upload/document', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;
