import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isDarkMode: boolean;
  isLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;
}

const initialState: UIState = { isDarkMode: false, isLoading: false, toastMessage: null, toastType: null };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => { state.isDarkMode = !state.isDarkMode; },
    setDarkMode: (state, action: PayloadAction<boolean>) => { state.isDarkMode = action.payload; },
    showToast: (state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>) => {
      state.toastMessage = action.payload.message;
      state.toastType = action.payload.type;
    },
    clearToast: (state) => { state.toastMessage = null; state.toastType = null; },
  },
});

export const { toggleDarkMode, setDarkMode, showToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;
