import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

export default function RiderMapScreen() {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.center}>
        <Ionicons name="map-outline" size={64} color={Colors.textLight} />
        <Text style={styles.title}>{t('navigationTitle')}</Text>
        <Text style={styles.subtitle}>{t('mapComingSoon')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: '#F9FAFB', marginTop: 16 },
  subtitle: { fontSize: FontSize.base, color: '#9CA3AF', marginTop: 8 },
});
