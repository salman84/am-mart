import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AppSettings {
  appName: string;
  appLogo: string;
  appTagline: string;
  currencySymbol: string;
  currency: string;          // ISO code e.g. KRW, USD
  primaryColor: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  popularSearches: string[];
  supportEmail: string;
  supportPhone: string;
  featureTopup: boolean;
  featureSim: boolean;
  featureWallet: boolean;
  featureReviews: boolean;
  featureDeliveryTracking: boolean;
  appMinVersion: string;
  loaded: boolean;
}

const initialState: AppSettings = {
  appName: 'AM Mart',
  appLogo: '',
  appTagline: '',
  currencySymbol: '₩',
  currency: 'KRW',
  primaryColor: '#10B981',
  deliveryFee: 3000,
  freeDeliveryThreshold: 50000,
  popularSearches: ['Milk', 'Rice', 'Chicken', 'Bread', 'Snacks', 'Drinks'],
  supportEmail: '',
  supportPhone: '',
  featureTopup: true,
  featureSim: true,
  featureWallet: true,
  featureReviews: true,
  featureDeliveryTracking: true,
  appMinVersion: '1.0.0',
  loaded: false,
};

const appSettingsSlice = createSlice({
  name: 'appSettings',
  initialState,
  reducers: {
    setSettings(state, action: PayloadAction<Partial<AppSettings>>) {
      return { ...state, ...action.payload, loaded: true };
    },
    resetSettings() {
      return initialState;
    },
  },
});

export const { setSettings, resetSettings } = appSettingsSlice.actions;
export default appSettingsSlice.reducer;
