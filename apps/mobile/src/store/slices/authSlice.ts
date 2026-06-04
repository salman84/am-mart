import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { authApi, userApi, setCachedToken, clearApiCache } from '../../services/api';

interface User {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  avatar?: string;
  role: string;
  status: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (credentials: { identifier: string; password: string }, { rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials);
    const { accessToken, refreshToken, user } = res.data;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    setCachedToken(accessToken);   // populate memory cache immediately
    return user;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'Login failed');
  }
});

export const loginWithOtp = createAsyncThunk('auth/loginWithOtp', async (data: { userId: string; otp: string }, { rejectWithValue }) => {
  try {
    const res = await authApi.loginWithOtp(data);
    const { accessToken, refreshToken, user } = res.data;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    setCachedToken(accessToken);   // populate memory cache immediately
    return user;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message || 'OTP verification failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  // Always clear local state regardless of API success
  try { await authApi.logout(); } catch {} // server call optional — don't block logout
  setCachedToken(null);            // clear memory cache
  clearApiCache();                 // clear all response cache on logout
  await SecureStore.deleteItemAsync('accessToken').catch(() => {});
  await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
  await SecureStore.deleteItemAsync('ammart_lang_setup').catch(() => {});
  // Clear ALL persisted data so next login or reinstall is truly fresh
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.multiRemove([
    'persist:ammart-root',     // Redux persisted state
    '@ammart_language',        // Language preference
    '@ammart_first_run',       // First-run flag (so language picker shows again)
    '@ammart_branding_cache',  // Branding cache
    '@ammart_pin',             // PIN lock
    '@ammart_pin_enabled',     // PIN enabled flag
    '@ammart_last_activity',   // PIN activity timestamp
  ]).catch(() => {});
});

export const loadProfile = createAsyncThunk('auth/loadProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await userApi.getProfile();
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e.response?.data?.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => { state.user = action.payload; state.isAuthenticated = true; },
    clearError: (state) => { state.error = null; },
    updateAvatar: (state, action: PayloadAction<string>) => { if (state.user) state.user.avatar = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => { state.isLoading = false; state.user = action.payload; state.isAuthenticated = true; })
      .addCase(login.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(loginWithOtp.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginWithOtp.fulfilled, (state, action) => { state.isLoading = false; state.user = action.payload; state.isAuthenticated = true; })
      .addCase(loginWithOtp.rejected, (state, action) => { state.isLoading = false; state.error = action.payload as string; })
      .addCase(logout.fulfilled, (state) => { state.user = null; state.isAuthenticated = false; state.error = null; })
      .addCase(logout.rejected, (state) => { state.user = null; state.isAuthenticated = false; state.error = null; })
      .addCase(loadProfile.fulfilled, (state, action) => { state.user = action.payload; state.isAuthenticated = true; })
      .addCase(loadProfile.rejected, (state) => {
        // Token is invalid/expired and refresh failed — force clean state
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { setUser, clearError, updateAvatar } = authSlice.actions;
export default authSlice.reducer;
