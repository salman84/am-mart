import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Constants from 'expo-constants';

export function AppVersionGate({ children }: { children: React.ReactNode }) {
  const appMinVersion = useSelector((state: RootState) => (state.appSettings as any)?.appMinVersion || '1.0.0');
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    if (isVersionLess(currentVersion, appMinVersion)) {
      setNeedsUpdate(true);
    }
  }, [appMinVersion]);

  if (!needsUpdate) return <>{children}</>;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.body}>
            A new version of the app is required. Please update to continue.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => Linking.openURL('https://play.google.com/store')}
          >
            <Text style={styles.btnText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function isVersionLess(current: string, min: string): boolean {
  const c = current.split('.').map(Number);
  const m = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (m[i] || 0)) return true;
    if ((c[i] || 0) > (m[i] || 0)) return false;
  }
  return false;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%' },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 12 },
  body: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  btn: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
