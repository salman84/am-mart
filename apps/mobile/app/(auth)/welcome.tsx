import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBranding } from '../../src/context/BrandingContext';
import { useLanguage } from '../../src/i18n';

// Bundled logo — always available, no network needed
const LOCAL_LOGO = require('../../assets/splash-logo.png');

// Logo: prefer remote https URL, fall back to bundled asset
function WelcomeLogo({ url, size }: { url: string; size: number }) {
  const [useFallback, setUseFallback] = React.useState(false);
  const isValidHttps = url?.startsWith('https://');
  if (!useFallback && isValidHttps) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setUseFallback(true)}
      />
    );
  }
  return <Image source={LOCAL_LOGO} style={{ width: size, height: size }} resizeMode="contain" />;
}

export default function WelcomeScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { t } = useLanguage();
  const { appLogo, appTagline } = useBranding();   // live from backend — no hardcoding
  const { width, height } = useWindowDimensions();

  // Responsive card size: 2 columns with gap, capped for tablets
  const cardSize = Math.min((width - Spacing.lg * 2 - 12) / 2, 200);
  const logoSize = Math.min(width * 0.35, 160);
  const isSmall  = height < 700;

  const features = [
    { icon: '🛒', label: t('groceriesMore'), color: '#D1FAE5' },
    { icon: '📱', label: t('simCards'),      color: '#EDE9FE' },
    { icon: '💳', label: t('mobileTopUp'),   color: '#DBEAFE' },
    { icon: '🚀', label: t('fastDelivery'),  color: '#FEF3C7' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#10B981', '#059669', '#047857']} style={styles.gradient}>

        {/* ── Logo ── */}
        <View style={[styles.logoSection, isSmall && { paddingTop: 20, paddingBottom: 12 }]}>
          <WelcomeLogo url={appLogo} size={logoSize} />
          {/* Only show tagline if admin set one — no hardcoded fallback */}
          {!!appTagline && (
            <Text style={styles.tagline}>{appTagline}</Text>
          )}
        </View>

        {/* ── Feature cards ── */}
        <View style={styles.cardsSection}>
          <View style={styles.cardGrid}>
            {features.map((item, i) => (
              <View
                key={i}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: item.color,
                    width: cardSize,
                    paddingVertical: isSmall ? 14 : 18,
                  },
                ]}
              >
                <Text style={[styles.featureIcon, isSmall && { fontSize: 22 }]}>
                  {item.icon}
                </Text>
                <Text style={styles.featureLabel} numberOfLines={2} adjustsFontSizeToFit>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Buttons ── */}
        <View style={[styles.bottomSection, isSmall && { paddingBottom: 20, gap: 8 }]}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push({ pathname: '/(auth)/login', params: { returnTo } })}
          >
            <Text style={styles.loginText}>{t('signIn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push({ pathname: '/(auth)/register', params: { returnTo } })}
          >
            <Text style={styles.registerText}>{t('createAccount')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(auth)/login-otp', params: { returnTo } })}
          >
            <Text style={styles.otpText}>{t('signInOTP')}</Text>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient:  { flex: 1, paddingHorizontal: Spacing.lg },

  /* Logo section */
  logoSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: Spacing.lg,
  },
  tagline: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  /* Cards */
  cardsSection: { flex: 1, justifyContent: 'center' },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  featureCard: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  featureIcon:  { fontSize: 26, marginBottom: 6 },
  featureLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 6,
  },

  /* Buttons */
  bottomSection: { paddingBottom: 36, gap: 12 },
  loginButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  loginText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  registerButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 15,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  registerText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  otpText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
});
