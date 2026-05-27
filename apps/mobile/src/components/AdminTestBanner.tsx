import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { router } from 'expo-router';

export function AdminTestBanner() {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.dot} />
      <Text style={styles.text}>🔧 ADMIN TEST MODE — Orders & Payments are simulated</Text>
      <TouchableOpacity onPress={() => router.push('/(customer)/profile' as any)} style={styles.btn}>
        <Text style={styles.btnText}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCA5A5' },
  text: { flex: 1, color: '#fff', fontSize: 11, fontWeight: '700' },
  btn: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 },
  btnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
