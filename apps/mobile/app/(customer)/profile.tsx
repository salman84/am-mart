import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { walletApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage } from '../../src/i18n';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
  const { t, language, setLanguage } = useLanguage();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      walletApi.getBalance().then((r) => setWalletBalance(r.data?.balance ?? 0)).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await dispatch(logout());
  };

  const ACCOUNT_ITEMS = [
    { icon: 'person-outline', label: t('myInformation'), sublabel: user?.email || user?.phone || t('editProfileDetails'), action: 'info' },
    { icon: 'location-outline', label: t('myAddresses'), sublabel: t('deliveryAddresses'), action: 'addresses' },
    { icon: 'wallet-outline', label: t('myWallet'), sublabel: walletBalance !== null ? `${currency}${walletBalance.toLocaleString()}` : '...', action: 'wallet' },
    { icon: 'heart-outline', label: t('wishlist'), sublabel: t('savedItems'), action: 'wishlist' },
  ];

  const SUPPORT_ITEMS = [
    { icon: 'notifications-outline', label: t('notifications'), action: 'notifications' },
    { icon: 'headset-outline', label: t('support'), action: 'support' },
    { icon: 'document-text-outline', label: t('termsPrivacy'), action: 'terms' },
  ];

  const handleMenuTap = (action: string) => {
    if (!isAuthenticated) {
      Toast.show({ type: 'info', text1: t('signInToAccess') });
      return;
    }
    if (action === 'notifications') router.push('/(customer)/notifications');
    else Toast.show({ type: 'info', text1: `Coming soon` });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('myProfile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        {isAuthenticated ? (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.fullName?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.fullName}</Text>
              {user?.phone && <Text style={styles.profileMeta}>{user.phone}</Text>}
              {user?.email && <Text style={styles.profileMeta}>{user.email}</Text>}
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <Ionicons name="person-outline" size={30} color={Colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guestTitle}>{t('guestUser')}</Text>
              <Text style={styles.guestSub}>{t('signInToAccess')}</Text>
            </View>
          </View>
        )}

        {/* Auth buttons for guests */}
        {!isAuthenticated && (
          <View style={styles.authButtons}>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => router.push({ pathname: '/(auth)/welcome', params: { returnTo: '' } })}
            >
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.signInText}>{t('signIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push({ pathname: '/(auth)/register', params: { returnTo: '' } })}
            >
              <Text style={styles.registerText}>{t('createAccount')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Row — authenticated only */}
        {isAuthenticated && (
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(customer)/orders')}>
              <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>{t('ordersCount')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Ionicons name="heart-outline" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>—</Text>
              <Text style={styles.statLabel}>{t('wishlistCount')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{walletBalance !== null ? `${currency}${walletBalance.toLocaleString()}` : '...'}</Text>
              <Text style={styles.statLabel}>{t('walletBalance')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Language */}
        <View style={styles.card}>
          <View style={styles.cardRowHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="language-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.cardLabel}>{t('language')}</Text>
          </View>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>English</Text>
              {language === 'en' && <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'ko' && styles.langOptionActive]}
              onPress={() => setLanguage('ko')}
            >
              <Text style={[styles.langText, language === 'ko' && styles.langTextActive]}>한국어</Text>
              {language === 'ko' && <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Menu */}
        <View style={styles.menuCard}>
          <Text style={styles.menuSectionLabel}>{t('account')}</Text>
          {ACCOUNT_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.action}
              style={[styles.menuRow, index < ACCOUNT_ITEMS.length - 1 && styles.menuRowBorder]}
              onPress={() => handleMenuTap(item.action)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sublabel && <Text style={styles.menuSublabel} numberOfLines={1}>{item.sublabel}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.borderLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Menu */}
        <View style={styles.menuCard}>
          <Text style={styles.menuSectionLabel}>{t('settingsSupport')}</Text>
          {/* Notifications toggle */}
          <View style={[styles.menuRow, styles.menuRowBorder]}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={[styles.menuLabel, { flex: 1 }]}>{t('pushNotifications')}</Text>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: Colors.border, true: Colors.primaryLight }}
              thumbColor={notifEnabled ? Colors.primary : Colors.textLight}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
          {SUPPORT_ITEMS.filter((s) => s.action !== 'notifications').map((item, index) => (
            <TouchableOpacity
              key={item.action}
              style={[styles.menuRow, index < SUPPORT_ITEMS.length - 2 && styles.menuRowBorder]}
              onPress={() => handleMenuTap(item.action)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.borderLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        {isAuthenticated && (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>{t('signOut')}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.version}>{t('version')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.sm, gap: 10, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.base, ...Shadow.sm,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  profileMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  guestCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.base,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.base, ...Shadow.sm,
  },
  guestAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.surfaceVariant, justifyContent: 'center', alignItems: 'center',
  },
  guestTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  guestSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  authButtons: { flexDirection: 'row', gap: 10 },
  signInBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, height: 46, borderRadius: BorderRadius['2xl'],
  },
  signInText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  registerBtn: {
    flex: 1, height: 46, borderRadius: BorderRadius['2xl'],
    borderWidth: 1.5, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  registerText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, ...Shadow.sm,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 10 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, gap: 12,
  },
  cardRowHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardLabel: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.sm, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.borderLight, backgroundColor: Colors.surfaceVariant,
  },
  langOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  langText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  langTextActive: { color: Colors.primary },
  menuCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, ...Shadow.sm,
    paddingHorizontal: Spacing.base, overflow: 'hidden',
  },
  menuSectionLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingTop: 14, paddingBottom: 8,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 13,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  menuTextBox: { flex: 1 },
  menuLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium },
  menuSublabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.danger,
  },
  logoutText: { color: Colors.danger, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
});
