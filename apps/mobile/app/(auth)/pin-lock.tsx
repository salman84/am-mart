import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  verifyPin, isBioEnabled, authenticateWithBiometrics,
  getBiometricInfo, recordActivity, BiometricType,
} from '../../src/utils/pinSecurity';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const MAX_ATTEMPTS = 5;

export default function PinLockScreen() {
  const { t } = useLanguage();
  const [pin, setPin]             = useState('');
  const [attempts, setAttempts]   = useState(0);
  const [bioInfo, setBioInfo]     = useState<{ available: boolean; types: BiometricType[] } | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const shakeAnim = new Animated.Value(0);

  useEffect(() => {
    (async () => {
      const info = await getBiometricInfo();
      setBioInfo(info);
      const bioOn = await isBioEnabled();
      setBioEnabled(bioOn);
      if (bioOn && info.available) {
        tryBiometrics();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const unlock = async () => {
    await recordActivity();
    router.replace('/(customer)');
  };

  const tryBiometrics = async () => {
    const ok = await authenticateWithBiometrics();
    if (ok) { await unlock(); }
  };

  const handleKey = async (key: string) => {
    if (key === '⌫') { setPin((p) => p.slice(0, -1)); return; }
    if (key === '') return;
    const next = pin + key;
    if (next.length > 4) return;
    setPin(next);

    if (next.length === 4) {
      const ok = await verifyPin(next);
      if (ok) {
        await unlock();
      } else {
        shake();
        setPin('');
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          Toast.show({ type: 'error', text1: t('tooManyAttempts'), text2: t('loginAgain') });
          router.replace('/(auth)/login');
        } else {
          Toast.show({
            type: 'error',
            text1: t('wrongPin'),
            text2: t('attemptsRemaining').replace('{count}', String(MAX_ATTEMPTS - newAttempts)),
          });
        }
      }
    }
  };

  const handleFullLogin = () => {
    router.replace('/(auth)/login');
  };

  const getBioIcon = () => {
    if (!bioInfo?.available) return 'finger-print-outline';
    if (bioInfo.types.includes('face')) return 'scan-outline';
    return 'finger-print-outline';
  };

  const getBioLabel = () => {
    if (!bioInfo?.available) return '';
    if (bioInfo.types.includes('face')) return t('unlockFaceId');
    return t('unlockFingerprint');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{t('unlockApp')}</Text>
        <Text style={styles.subtitle}>{t('enter4DigitPin')}</Text>
      </View>

      {/* Dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {[0,1,2,3].map((i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length ? styles.dotFilled : styles.dotEmpty]}
          />
        ))}
      </Animated.View>

      {/* Bio unlock button */}
      {bioEnabled && bioInfo?.available && (
        <TouchableOpacity style={styles.bioBtn} onPress={tryBiometrics}>
          <Ionicons name={getBioIcon() as any} size={26} color={Colors.primary} />
          <Text style={styles.bioText}>{getBioLabel()}</Text>
        </TouchableOpacity>
      )}

      {/* Keypad */}
      <View style={styles.keypad}>
        {KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, key === '' && styles.keyEmpty]}
            onPress={() => key !== '' && handleKey(key)}
            activeOpacity={key === '' ? 1 : 0.6}
            disabled={key === ''}
          >
            {key === '⌫' ? (
              <Ionicons name="backspace-outline" size={26} color={Colors.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Full login link */}
      <TouchableOpacity style={styles.loginLink} onPress={handleFullLogin}>
        <Text style={styles.loginLinkText}>{t('signInPassword')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },

  header: { alignItems: 'center', marginTop: Spacing['3xl'], paddingHorizontal: Spacing.xl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight, justifyContent: 'center',
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary },

  dotsRow: { flexDirection: 'row', gap: 20, marginVertical: 40 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  dotEmpty: { backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#D1D5DB' },
  dotFilled: { backgroundColor: Colors.primary },

  bioBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.base,
    backgroundColor: Colors.primaryLight, borderRadius: 50,
    marginBottom: Spacing.lg,
  },
  bioText: { fontSize: FontSize.base, color: Colors.primary, fontWeight: FontWeight.semibold },

  keypad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 300, marginTop: 'auto', marginBottom: Spacing.base,
  },
  key: {
    width: 100, height: 76,
    justifyContent: 'center', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: FontSize['4xl'], fontWeight: FontWeight.medium, color: Colors.text },

  loginLink: { paddingVertical: Spacing.base, marginBottom: Spacing.lg },
  loginLinkText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
});
