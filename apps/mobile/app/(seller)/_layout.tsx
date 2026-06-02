import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../src/theme';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';

export default function SellerLayout() {
  const user = useSelector((state: RootState) => state.auth.user);

  // Route guard — only SELLER role can access seller screens
  useEffect(() => {
    if (user && user.role !== 'SELLER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.replace('/(customer)');
    }
  }, [user?.role]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="products" options={{ title: 'Products', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'cube' : 'cube-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="seller-profile" options={{ title: 'Profile', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="add-product" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { height: 64, paddingBottom: 8, paddingTop: 4, backgroundColor: '#fff' },
  tabLabel: { fontSize: FontSize.xs, fontWeight: '600' },
});
