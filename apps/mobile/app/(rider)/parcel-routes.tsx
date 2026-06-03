import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { driverRouteApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import Toast from 'react-native-toast-message';
import { useLanguage } from '../../src/i18n';

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#6B7280',
  ASSIGNED: '#3B82F6',
  IN_PROGRESS: '#F59E0B',
  COMPLETED: '#10B981',
  PARTIALLY_COMPLETED: '#F97316',
  CANCELLED: '#EF4444',
};

export default function ParcelRoutesScreen() {
  const { t } = useLanguage();
  const [routes, setRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutes = useCallback(async () => {
    try {
      const res = await driverRouteApi.getMyRoutes({ limit: 50 });
      setRoutes(res.data.routes || []);
    } catch {
      Toast.show({ type: 'error', text1: t('somethingWrong') });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadRoutes(); }, [loadRoutes]));

  const handleStartRoute = async (routeId: string) => {
    try {
      await driverRouteApi.updateRouteStatus(routeId, 'IN_PROGRESS');
      Toast.show({ type: 'success', text1: t('routeInProgress') });
      loadRoutes();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      await driverRouteApi.updateRouteStatus(routeId, 'COMPLETED');
      Toast.show({ type: 'success', text1: t('routeCompleted') });
      loadRoutes();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || t('somethingWrong') });
    }
  };

  const renderRoute = ({ item }: { item: any }) => {
    const color = STATUS_COLORS[item.status] || '#6B7280';
    const isActive = item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED';

    return (
      <TouchableOpacity
        style={[styles.routeCard, isActive && styles.routeCardActive]}
        onPress={() => router.push({ pathname: '/(rider)/route-detail', params: { routeId: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.routeInfo}>
            <Text style={styles.routeNumber}>{item.routeNumber}</Text>
            <Text style={styles.routeDate}>
              {new Date(item.plannedDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{item.status?.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {item.fulfillmentCenter && (
          <View style={styles.centerRow}>
            <Ionicons name="business-outline" size={14} color="#9CA3AF" />
            <Text style={styles.centerText}>{item.fulfillmentCenter.name}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color="#60A5FA" />
            <Text style={styles.statText}>
              {t('stopsLabel').replace('{completed}', String(item.completedStops)).replace('{total}', String(item.totalStops))}
            </Text>
          </View>
          {item.failedStops > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={[styles.statText, { color: '#EF4444' }]}>
                {t('failedStopsLabel').replace('{count}', String(item.failedStops))}
              </Text>
            </View>
          )}
          {item.totalDistance && (
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={16} color="#9CA3AF" />
              <Text style={styles.statText}>{item.totalDistance.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        {/* Progress Bar */}
        {item.totalStops > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${Math.round((item.completedStops / item.totalStops) * 100)}%`,
                backgroundColor: color,
              }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round((item.completedStops / item.totalStops) * 100)}%
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {item.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleStartRoute(item.id)}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>{t('startRoute')}</Text>
          </TouchableOpacity>
        )}
        {item.status === 'IN_PROGRESS' && item.completedStops + item.failedStops >= item.totalStops && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={() => handleCompleteRoute(item.id)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>{t('completeRoute')}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('parcelRoutes')}</Text>
          <Text style={styles.headerSubtitle}>{t('parcelRoutesSubtitle')}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={72} color="#4B5563" />
          <Text style={styles.emptyTitle}>{t('noRoutesAssigned')}</Text>
          <Text style={styles.emptySubtitle}>{t('noRoutesDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          renderItem={renderRoute}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadRoutes(); }}
              tintColor="#3B82F6" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base,
    backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  headerSubtitle: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB', marginTop: Spacing.base },
  emptySubtitle: { fontSize: FontSize.base, color: '#9CA3AF', marginTop: Spacing.xs, textAlign: 'center' },
  listContent: { padding: Spacing.base },
  routeCard: {
    backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.base,
    borderWidth: 1, borderColor: '#374151', gap: 12,
  },
  routeCardActive: { borderColor: '#3B82F680' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  routeInfo: {},
  routeNumber: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  routeDate: { fontSize: FontSize.sm, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  centerText: { fontSize: FontSize.sm, color: '#9CA3AF' },
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: FontSize.sm, color: '#D1D5DB' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#374151', borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: FontSize.xs, color: '#9CA3AF', width: 35, textAlign: 'right' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: BorderRadius.xl,
  },
  actionBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
