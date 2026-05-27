import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { orderApi } from '../../services/api';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    discountPrice?: number;
    images: { url: string }[];
    seller: { storeName: string };
  };
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
}

const initialState: CartState = { items: [], itemCount: 0, subtotal: 0, isLoading: false };

export const fetchCart = createAsyncThunk('cart/fetch', async () => {
  const res = await orderApi.getCart();
  return res.data;
});

export const addToCart = createAsyncThunk('cart/add', async ({ productId, quantity }: { productId: string; quantity: number }) => {
  const res = await orderApi.addToCart(productId, quantity);
  return res.data;
});

export const updateCartItem = createAsyncThunk('cart/update', async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
  const res = await orderApi.updateCartItem(itemId, quantity);
  return { itemId, quantity, data: res.data };
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCart: (state) => { state.items = []; state.itemCount = 0; state.subtotal = 0; },
    setCart: (state, action) => {
      state.items = action.payload.items;
      state.itemCount = action.payload.itemCount;
      state.subtotal = action.payload.subtotal;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.itemCount = action.payload.itemCount;
        state.subtotal = action.payload.subtotal;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const { itemId, quantity } = action.payload;
        if (quantity === 0) {
          state.items = state.items.filter((i) => i.id !== itemId);
        } else {
          const item = state.items.find((i) => i.id === itemId);
          if (item) item.quantity = quantity;
        }
        state.itemCount = state.items.reduce((s, i) => s + i.quantity, 0);
        state.subtotal = state.items.reduce((s, i) => s + (i.product.discountPrice || i.product.price) * i.quantity, 0);
      });
  },
});

export const { clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
