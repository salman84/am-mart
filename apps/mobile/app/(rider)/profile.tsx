import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';
import { RootState, AppDispatch } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../src/theme';

export default function RiderProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={Colors.secondary} />
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Rider</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', padding: Spacing.base },
  header: { paddingVertical: Spacing.base },
  headerTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: '#F9FAFB' },
  profileCard: { backgroundColor: '#1F2937', borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginTop: Spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.base },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#F9FAFB' },
  phone: { fontSize: FontSize.base, color: '#9CA3AF', marginTop: 4 },
  roleBadge: { marginTop: Spacing.sm, backgroundColor: `${Colors.secondary}20`, paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  roleText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.secondary },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing['2xl'], backgroundColor: '#1F2937', padding: Spacing.base, borderRadius: BorderRadius.xl },
  logoutText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: '#EF4444' },
});
