import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@ammart_browsing_history';
const MAX_ITEMS = 30;

export interface HistoryProduct {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  unit?: string;
  viewedAt: number; // timestamp
}

export async function recordProductView(product: {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  images?: { url: string }[];
  unit?: string;
}): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let history: HistoryProduct[] = raw ? JSON.parse(raw) : [];

    // Remove existing entry for this product (to move it to top)
    history = history.filter((h) => h.id !== product.id);

    // Add to front
    history.unshift({
      id: product.id,
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      imageUrl: product.images?.[0]?.url,
      unit: product.unit,
      viewedAt: Date.now(),
    });

    // Keep only latest MAX_ITEMS
    if (history.length > MAX_ITEMS) history = history.slice(0, MAX_ITEMS);

    await AsyncStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Never block on history errors
  }
}

export async function getBrowsingHistory(): Promise<HistoryProduct[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearBrowsingHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
