import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Switch, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import {
  savePin, getBiometricInfo, setBioEnabled, BiometricType,
} from '../../src/utils/pinSecurity';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinSetupScreen() {
  const { t } = useLanguage();
  const [step, setStep]           = useState<'create' | 'confirm'>('create');
  const [pin, setPin]             = useState('');
  const [firstPin, setFirstPin]   = useState('');
  const [useBio, setUseBio]       = useState(false);
  const [bioInfo, setBioInfo]     = useState<{ available: boolean; types: BiometricType[] } | null>(null);
  const shakeAnim = new Animated.Value(0);

  useEffect(() => {
    getBiometricInfo().then((info) => {
      setBioInfo(info);
      if (info.available) setUseBio(true);
    });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (key: string) => {
    if (key === '') return;
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = pin + key;
    if (next.length > 4) return;
    setPin(next);

    if (next.length === 4) {
      if (step === 'create') {
        setFirstPin(next);
        setPin('');
        setStep('confirm');
      } else {
        if (next === firstPin) {
          handleSave(next);
        } else {
          shake();
          setPin('');
          Toast.show({ type: 'error', text1: t('pinMismatch'), text2: t('pinMismatchSub') });
        }
      }
    }
  };

  const handleSave = async (confirmedPin: string) => {
    await savePin(confirmedPin);
    if (useBio && bioInfo?.available) {
      await setBioEnabled(true);
    }
    Toast.show({ type: 'success', text1: t('pinSaved') });
    router.replace('/(customer)');
  };

  const handleSkip = () => {
    router.replace('/(customer)');
  };

  const getBioLabel = () => {
    if (!bioInfo?.available) return '';
    if (bioInfo.types.includes('face')) return t('useFaceSuffix');
    return t('useFingerprintSuffix');
  };

  const getBioIcon = () => {
    if (!bioInfo?.available) return 'lock-closed-outline';
    if (bioInfo.types.includes('face')) return 'scan-outline';
    return 'finger-print-outline';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('later')}</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark-outline" size={38} color={Colors.primary} />
        </View>
        <Text style={styles.title}>
          {step === 'create' ? t('pinSetupTitle') : t('pinConfirmTitle')}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create' ? t('pinSetupSubtitle') : t('pinConfirmSubtitle')}
        </Text>
      </View>

      {/* Dots */}
      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {[0,1,2,3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length ? styles.dotFilled : styles.dotEmpty,
            ]}
          />
        ))}
      </Animated.View>

      {/* Biometrics toggle */}
      {bioInfo?.available && step === 'create' && (
        <View style={styles.bioRow}>
          <Ionicons name={getBioIcon() as any} size={22} color={Colors.primary} />
          <Text style={styles.bioLabel}>{getBioLabel()}</Text>
          <Switch
            value={useBio}
            onValueChange={setUseBio}
            trackColor={{ false: Colors.borderLight, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },
  skipBtn: { alignSelf: 'flex-end', paddingHorizontal: Spacing.lg, paddingTop: Spacing.base },
  skipText: { fontSize: FontSize.base, color: Colors.textSecondary },

  header: { alignItems: 'center', marginTop: Spacing.lg, paddingHorizontal: Spacing.xl },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryLight, justifyContent: 'center',
    alignItems: 'center', marginBottom: Spacing.lg,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  dotsRow: { flexDirection: 'row', gap: 20, marginVertical: 36 },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotEmpty: { backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#D1D5DB' },
  dotFilled: { backgroundColor: Colors.primary },

  bioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    marginBottom: Spacing.base, marginHorizontal: Spacing.xl,
  },
  bioLabel: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.primary },

  keypad: {
    flexDirection: 'row', flexWrap: 'wrap',
    width: 300, marginTop: 'auto', marginBottom: Spacing['3xl'],
    gap: 0,
  },
  key: {
    width: 100, height: 76,
    justifyContent: 'center', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: FontSize['4xl'], fontWeight: FontWeight.medium, color: Colors.text },
});
