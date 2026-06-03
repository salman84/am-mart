import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Switch, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { riderApi, driverRouteApi } from '../../src/services/api';
import * as Location from 'expo-location';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

export default function RiderDashboardScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const currency = useSelector((state: any) => state.appSettings?.currencySymbol ?? '₩');
  const { t } = useLanguage();

  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<any>(null);
  const [todayRoutes, setTodayRoutes] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [earningsRes, routesRes] = await Promise.allSettled([
        riderApi.getEarnings(),
        driverRouteApi.getMyRoutes({ limit: 10 }),
      ]);

      if (earningsRes.status === 'fulfilled') setEarnings(earningsRes.value.data);

      if (routesRes.status === 'fulfilled') {
        const routes = routesRes.value.data.routes || [];
        setTodayRoutes(routes);
        const active = routes.find((r: any) => r.status === 'IN_PROGRESS');
        setActiveRoute(active || null);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const toggleOnline = async (value: boolean) => {
    let lat, lng;
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: t('locationRequired') || 'Location required' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    }
    try {
      await riderApi.updateOnlineStatus(value, lat, lng);
      setIsOnline(value);
      Toast.show({ type: 'success', text1: value ? (t('nowOnline') || 'Online') : (t('nowOffline') || 'Offline') });
    } catch {
      Toast.show({ type: 'error', text1: t('failedUpdateStatus') || 'Failed' });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  const assignedRoutes = todayRoutes.filter((r: any) => r.status === 'ASSIGNED');
  const completedRoutes = todayRoutes.filter((r: any) => ['COMPLETED', 'PARTIALLY_COMPLETED'].includes(r.status));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{t('sellerWelcome') || 'Welcome'}</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
        </View>
        <View style={styles.onlineToggle}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#6B7280' }]} />
          <Text style={[styles.onlineLabel, { color: isOnline ? '#10B981' : '#9CA3AF' }]}>
            {isOnline ? (t('riderOnline') || 'Online') : (t('riderOffline') || 'Offline')}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#374151', true: '#065F46' }}
            thumbColor={isOnline ? '#10B981' : '#6B7280'}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadDashboard(); }}
            tintColor="#3B82F6" />
        }
      >
        {/* Active Route Banner */}
        {activeRoute && (
          <TouchableOpacity
            style={styles.activeRouteBanner}
            onPress={() => router.push({ pathname: '/(rider)/route-detail', params: { routeId: activeRoute.id } })}
          >
            <View style={styles.activePulse} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>{t('routeInProgress') || 'Route In Progress'}</Text>
              <Text style={styles.activeSubtitle}>
                {activeRoute.routeNumber} · {activeRoute.completedStops}/{activeRoute.totalStops} {t('parcelStops') || 'stops'}
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Today's Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="cube" size={22} color="#3B82F6" />
            <Text style={styles.statValue}>{earnings?.todayDeliveries || 0}</Text>
            <Text style={styles.statLabel}>{t('riderTodayDeliveries') || "Today's Deliveries"}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={22} color="#10B981" />
            <Text style={styles.statValue}>{currency}{(earnings?.todayEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('riderTodayEarnings') || "Today's Earnings"}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={22} color="#F59E0B" />
            <Text style={styles.statValue}>{earnings?.rating?.toFixed(1) || '—'}</Text>
            <Text style={styles.statLabel}>{t('rating') || 'Rating'}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t('quickActions') || 'Quick Actions'}</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(rider)/parcel-routes')}>
            <View style={[styles.actionIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="map" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.actionLabel}>{t('parcelRoutes') || 'My Routes'}</Text>
            {assignedRoutes.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{assignedRoutes.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(rider)/scanner')}>
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="scan" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>{t('scanPackage') || 'Scan Package'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(rider)/earnings')}>
            <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="wallet" size={24} color="#10B981" />
            </View>
            <Text style={styles.actionLabel}>{t('riderEarningsTitle') || 'Earnings'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(rider)/profile')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F5920B20' }]}>
              <Ionicons name="person" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>{t('riderProfileTitle') || 'Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* Assigned Routes */}
        {assignedRoutes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('noRoutesAssigned') ? t('parcelRoutes') : 'Assigned Routes'} ({assignedRoutes.length})</Text>
            {assignedRoutes.map((route: any) => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => router.push({ pathname: '/(rider)/route-detail', params: { routeId: route.id } })}
              >
                <View style={styles.routeHeader}>
                  <View>
                    <Text style={styles.routeNumber}>{route.routeNumber}</Text>
                    <Text style={styles.routeDate}>{new Date(route.plannedDate).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.routeStops}>
                    <Ionicons name="location" size={14} color="#3B82F6" />
                    <Text style={styles.routeStopsText}>{route.totalStops} {t('parcelStops') || 'stops'}</Text>
                  </View>
                </View>
                {route.fulfillmentCenter && (
                  <View style={styles.routeCenterRow}>
                    <Ionicons name="business-outline" size={12} color="#6B7280" />
                    <Text style={styles.routeCenterText}>{route.fulfillmentCenter.name}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Completed Today */}
        {completedRoutes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('routeCompleted') || 'Completed'} ({completedRoutes.length})</Text>
            {completedRoutes.map((route: any) => (
              <View key={route.id} style={[styles.routeCard, { borderColor: '#10B98130' }]}>
                <View style={styles.routeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={[styles.routeNumber, { color: '#10B981' }]}>{route.routeNumber}</Text>
                  </View>
                  <Text style={styles.routeStopsText}>
                    {route.completedStops}/{route.totalStops}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* No routes offline message */}
        {!isOnline && todayRoutes.length === 0 && (
          <View style={styles.offlineMessage}>
            <Ionicons name="wifi-outline" size={48} color="#4B5563" />
            <Text style={styles.offlineTitle}>{t('riderOffline') || 'Offline'}</Text>
            <Text style={styles.offlineSubtitle}>{t('riderOfflineBanner') || 'Go online to receive route assignments'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  greeting: { fontSize: FontSize.sm, color: '#9CA3AF' },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  onlineLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  content: { padding: Spacing.base, gap: 16, paddingBottom: 40 },

  activeRouteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#3B82F6', borderRadius: BorderRadius.xl, padding: Spacing.base,
  },
  activePulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', opacity: 0.8 },
  activeTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  activeSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#1F2937', borderRadius: BorderRadius.lg,
    padding: Spacing.sm, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#374151',
  },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  statLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#F9FAFB', marginTop: 4 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '47%', backgroundColor: '#1F2937', borderRadius: BorderRadius.lg,
    padding: Spacing.base, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#374151', position: 'relative',
  },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#D1D5DB', textAlign: 'center' },
  badge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  routeCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151', gap: 8,
  },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeNumber: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  routeDate: { fontSize: FontSize.xs, color: '#9CA3AF', marginTop: 2 },
  routeStops: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeStopsText: { fontSize: FontSize.sm, color: '#9CA3AF' },
  routeCenterRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeCenterText: { fontSize: FontSize.xs, color: '#6B7280' },

  offlineMessage: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  offlineTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  offlineSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', textAlign: 'center' },
});
