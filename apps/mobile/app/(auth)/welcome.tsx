import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { appSettingsApi } from '../../src/services/api';
import { useLanguage } from '../../src/i18n';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { t } = useLanguage();
  const [brand, setBrand] = useState({ name: 'AM Mart', logo: '', tagline: '' });

  useEffect(() => {
    appSettingsApi.getPublic()
      .then((r) => {
        const d = r.data;
        if (d) {
          setBrand({
            name: d.APP_NAME || 'AM Mart',
            logo: d.APP_LOGO || '',
            tagline: d.APP_TAGLINE || '',
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#10B981', '#059669', '#047857']} style={styles.gradient}>
        <View style={styles.logoSection}>
          {brand.logo ? (
            <Image source={{ uri: brand.logo }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <View style={styles.logoCircle} />
          )}
          <Text style={styles.appName}>{brand.name}</Text>
          <Text style={styles.tagline}>
            {brand.tagline || 'Groceries • SIM Cards • Mobile Top-Up'}
          </Text>
        </View>

        <View style={styles.illustrationSection}>
          <View style={styles.featureCards}>
            {[
              { icon: '🛒', label: t('groceriesMore'), color: '#D1FAE5' },
              { icon: '📱', label: t('simCards'), color: '#EDE9FE' },
              { icon: '💳', label: t('mobileTopUp'), color: '#DBEAFE' },
              { icon: '🚀', label: t('fastDelivery'), color: '#FEF3C7' },
            ].map((item, i) => (
              <View key={i} style={[styles.featureCard, { backgroundColor: item.color }]}>
                <Text style={styles.featureIcon}>{item.icon}</Text>
                <Text style={styles.featureLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push({ pathname: '/(auth)/login', params: { returnTo } })}>
            <Text style={styles.loginText}>{t('signIn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerButton} onPress={() => router.push({ pathname: '/(auth)/register', params: { returnTo } })}>
            <Text style={styles.registerText}>{t('createAccount')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/login-otp', params: { returnTo } })}>
            <Text style={styles.otpText}>{t('signInOTP')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, paddingHorizontal: Spacing.lg },
  logoSection: { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#000',
    marginBottom: Spacing.base,
  },
  logoImage: { width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.base },
  logoText: { fontSize: 32, fontWeight: FontWeight.extrabold, color: '#fff' },
  appName: { fontSize: 36, fontWeight: FontWeight.extrabold, color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs },

  illustrationSection: { flex: 1, justifyContent: 'center' },
  featureCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  featureCard: {
    width: (width - 80) / 2, paddingVertical: 20,
    borderRadius: BorderRadius.lg, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  featureIcon: { fontSize: 32, marginBottom: 8 },
  featureLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: '#374151' },

  bottomSection: { paddingBottom: 40, gap: 12 },
  loginButton: {
    backgroundColor: '#fff', paddingVertical: 16,
    borderRadius: BorderRadius['2xl'], alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  loginText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  registerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16, borderRadius: BorderRadius['2xl'],
    alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  registerText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },
  otpText: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, textDecorationLine: 'underline' },
});
