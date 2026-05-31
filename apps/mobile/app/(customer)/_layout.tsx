import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../src/store';
import { setSettings } from '../../src/store/slices/appSettingsSlice';
import { appSettingsApi } from '../../src/services/api';
// Note: appSettingsApi.getPublic() uses the response cache — second call is instant (no network)
import { Colors } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminTestBanner } from '../../src/components/AdminTestBanner';

function TabIcon({ name, focused, badge }: { name: any; focused: boolean; badge?: number }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? Colors.primary : '#9CA3AF'}
      />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CustomerLayout() {
  const dispatch = useDispatch();
  const cartCount = useSelector((state: RootState) => state.cart.itemCount);
  const insets = useSafeAreaInsets();

  // Load app settings from backend once on mount
  useEffect(() => {
    appSettingsApi.getPublic().then((res) => {
      const s = res.data;
      if (!s) return;
      const sym = s.CURRENCY_SYMBOL || s.CURRENCY || '₩';
      dispatch(setSettings({
        appName:               s.APP_NAME             || 'AM Mart',
        appLogo:               s.APP_LOGO             || '',
        appTagline:            s.APP_TAGLINE          || '',
        currencySymbol:        sym,
        currency:              s.CURRENCY             || 'KRW',
        primaryColor:          s.PRIMARY_COLOR        || '#10B981',
        deliveryFee:           Number(s.DELIVERY_FEE) || 3000,
        freeDeliveryThreshold: Number(s.FREE_DELIVERY_THRESHOLD) || 50000,
        supportEmail:          s.SUPPORT_EMAIL        || '',
        supportPhone:          s.SUPPORT_PHONE        || '',
        popularSearches:
          s.APP_POPULAR_SEARCHES
            ? s.APP_POPULAR_SEARCHES.split(',').map((x: string) => x.trim()).filter(Boolean)
            : ['Milk', 'Rice', 'Chicken', 'Bread', 'Snacks', 'Drinks'],
        featureTopup:          s.FEATURE_TOPUP !== 'false',
        featureSim:            s.FEATURE_SIM !== 'false',
        featureWallet:         s.FEATURE_WALLET !== 'false',
        featureReviews:        s.FEATURE_REVIEWS !== 'false',
        featureDeliveryTracking: s.FEATURE_DELIVERY_TRACKING !== 'false',
        featureAddressSearch:  s.FEATURE_ADDRESS_SEARCH !== 'false',
        kakaoApiKey:           s.KAKAO_REST_API_KEY   || '',
        appMinVersion:         s.APP_MIN_VERSION      || '1.0.0',
      }));
    }).catch(() => { /* keep defaults */ });
  }, [dispatch]);

  // insets.bottom = system nav bar height (set by transparent windowTranslucentNavigation)
  const bottomInset = insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <AdminTestBanner />
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { paddingBottom: bottomInset + 4 }],
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="search" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="cart" focused={focused} badge={cartCount || undefined} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />

      {/* ── Hidden screens (never show in tab bar) ── */}
      <Tabs.Screen name="orders"         options={{ href: null }} />
      <Tabs.Screen name="checkout"       options={{ href: null }} />
      <Tabs.Screen name="notifications"  options={{ href: null }} />
      <Tabs.Screen name="products"       options={{ href: null }} />
      <Tabs.Screen name="exchange-rates" options={{ href: null }} />
      <Tabs.Screen name="coupons"        options={{ href: null }} />
      <Tabs.Screen name="addresses"      options={{ href: null }} />

      {/* Directories — always hidden from tab bar, accessed via home screen */}
      <Tabs.Screen name="product"        options={{ href: null }} />
      <Tabs.Screen name="order"          options={{ href: null }} />
      <Tabs.Screen name="sim"            options={{ href: null }} />
      <Tabs.Screen name="topup"          options={{ href: null }} />

    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabItem: { paddingTop: 6 },
  badge: {
    position: 'absolute', top: -4, right: -10,
    backgroundColor: Colors.danger, borderRadius: 10,
    minWidth: 16, height: 16, justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
