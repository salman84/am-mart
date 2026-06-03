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
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen name="index" options={{
        title: 'Dashboard',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />,
      }} />
      <Tabs.Screen name="parcel-routes" options={{
        title: 'Routes',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />,
      }} />
      <Tabs.Screen name="scanner" options={{
        title: 'Scanner',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'scan' : 'scan-outline'} size={22} color={color} />,
      }} />
      <Tabs.Screen name="earnings" options={{
        title: 'Earnings',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
      }} />

      {/* ── Hidden screens ── */}
      <Tabs.Screen name="route-detail" options={{ href: null }} />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60, paddingBottom: 6, paddingTop: 4,
    backgroundColor: '#1F2937', borderTopWidth: 0,
    elevation: 0, shadowOpacity: 0,
  },
  tabLabel: { fontSize: FontSize.xs, fontWeight: '600' },
});
