import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const MAX_HISTORY = 20;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface SearchHistoryState {
  items: SearchHistoryItem[];
}

const initialState: SearchHistoryState = {
  items: [],
};

const searchHistorySlice = createSlice({
  name: 'searchHistory',
  initialState,
  reducers: {
    addSearch(state, action: PayloadAction<string>) {
      const query = action.payload.trim();
      if (!query) return;
      // Remove duplicate if exists
      state.items = state.items.filter((i) => i.query.toLowerCase() !== query.toLowerCase());
      // Add to front
      state.items.unshift({ query, timestamp: Date.now() });
      // Keep max history
      if (state.items.length > MAX_HISTORY) {
        state.items = state.items.slice(0, MAX_HISTORY);
      }
    },
    removeSearch(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.query !== action.payload);
    },
    clearHistory(state) {
      state.items = [];
    },
  },
});

export const { addSearch, removeSearch, clearHistory } = searchHistorySlice.actions;
export default searchHistorySlice.reducer;
