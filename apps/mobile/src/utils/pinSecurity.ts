import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY          = '@ammart_pin';
const PIN_ENABLED_KEY  = '@ammart_pin_enabled';
const BIO_ENABLED_KEY  = '@ammart_bio_enabled';
const LAST_ACTIVE_KEY  = '@ammart_last_active';

/** Lock timeout: 5 minutes (300_000 ms) */
export const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

// ── PIN ──────────────────────────────────────────────────────────────────────

export async function savePin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await SecureStore.setItemAsync(PIN_ENABLED_KEY, 'true');
  await SecureStore.setItemAsync(LAST_ACTIVE_KEY, Date.now().toString());
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored === pin;
}

export async function isPinEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(PIN_ENABLED_KEY);
  return val === 'true';
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(PIN_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIO_ENABLED_KEY);
}

// ── Biometrics ────────────────────────────────────────────────────────────────

export type BiometricType = 'fingerprint' | 'face' | 'iris';

export interface BiometricInfo {
  available: boolean;
  types: BiometricType[];
  hasFingerprint: boolean;
  hasFace: boolean;
}

export async function getBiometricInfo(): Promise<BiometricInfo> {
  const hw = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hw || !enrolled) {
    return { available: false, types: [], hasFingerprint: false, hasFace: false };
  }
  const rawTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const types: BiometricType[] = rawTypes.map((t) => {
    if (t === LocalAuthentication.AuthenticationType.FINGERPRINT) return 'fingerprint';
    if (t === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) return 'face';
    return 'iris';
  });
  return {
    available: true,
    types,
    hasFingerprint: types.includes('fingerprint'),
    hasFace: types.includes('face'),
  };
}

export async function authenticateWithBiometrics(prompt = '신원을 확인하세요'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'PIN 사용',
    fallbackLabel: 'PIN 사용',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function isBioEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIO_ENABLED_KEY);
  return val === 'true';
}

export async function setBioEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIO_ENABLED_KEY, enabled ? 'true' : 'false');
}

// ── Session / Lock timing ────────────────────────────────────────────────────

export async function recordActivity(): Promise<void> {
  await SecureStore.setItemAsync(LAST_ACTIVE_KEY, Date.now().toString());
}

/** Returns true if the app should show PIN lock (inactive for > LOCK_TIMEOUT_MS) */
export async function shouldShowLock(): Promise<boolean> {
  const pinOn = await isPinEnabled();
  if (!pinOn) return false;
  const lastStr = await SecureStore.getItemAsync(LAST_ACTIVE_KEY);
  if (!lastStr) return true;
  const elapsed = Date.now() - parseInt(lastStr, 10);
  return elapsed > LOCK_TIMEOUT_MS;
}
