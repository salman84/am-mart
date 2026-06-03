import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../src/theme';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';

export default function RiderLayout() {
  const user = useSelector((state: RootState) => state.auth.user);

  // Route guard — only RIDER role can access rider screens
  useEffect(() => {
    if (user && user.role !== 'RIDER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
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
      <Tabs.Screen name="index" options={{ title: 'Deliveries', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'bicycle' : 'bicycle-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="parcel-routes" options={{ title: 'Routes', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'cube' : 'cube-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Navigate', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'map' : 'map-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="route-detail" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64, paddingBottom: 8, paddingTop: 4,
    backgroundColor: '#1F2937', borderTopWidth: 0,
  },
  tabLabel: { fontSize: FontSize.xs, fontWeight: '600' },
});
