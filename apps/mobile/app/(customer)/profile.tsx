import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../src/store';
import { logout } from '../../src/store/slices/authSlice';
import { walletApi, couponApi, orderApi } from '../../src/services/api';
import { isPinEnabled, clearPin } from '../../src/utils/pinSecurity';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import { useLanguage, LANGUAGES } from '../../src/i18n';
import { LanguagePickerModal } from '../../src/components/LanguagePickerModal';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const currency = useSelector((state: RootState) => (state.appSettings as any)?.currencySymbol || '₩');
  const { t, language } = useLanguage();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [couponCount, setCouponCount] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referredCount, setReferredCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  const currentLang = LANGUAGES.find((l) => l.code === language);

  React.useEffect(() => {
    if (isAuthenticated) {
      walletApi.getBalance().then((r) => setWalletBalance(r.data?.balance ?? 0)).catch(() => {});
      isPinEnabled().then(setPinEnabled);
      couponApi.getMyCoupons().then((r) => {
        const active = (r.data?.coupons || []).filter((c: any) => c.isValid).length;
        setCouponCount(active);
      }).catch(() => {});
      orderApi.getMyOrders({ limit: 1 }).then((r) => {
        setOrderCount(r.data?.total ?? r.data?.orders?.length ?? 0);
      }).catch(() => setOrderCount(0));
      couponApi.getReferralStats().then((r) => {
        setReferralCode(r.data?.referralCode || null);
        setReferredCount(r.data?.referredCount || 0);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await dispatch(logout());
  };

  const ACCOUNT_ITEMS = [
    { icon: 'person-outline', label: t('myInformation'), sublabel: user?.email || user?.phone || t('editProfileDetails'), action: 'info' },
    { icon: 'location-outline', label: t('myAddresses'), sublabel: t('deliveryAddresses'), action: 'addresses' },
    { icon: 'wallet-outline', label: t('myWallet'), sublabel: walletBalance !== null ? `${currency}${walletBalance.toLocaleString()}` : '...', action: 'wallet' },
    { icon: 'pricetag-outline', label: t('myCoupons'), sublabel: couponCount > 0 ? `${couponCount} active coupon${couponCount !== 1 ? 's' : ''}` : t('noCoupons'), action: 'coupons' },
    { icon: 'heart-outline', label: t('wishlist'), sublabel: t('savedItems'), action: 'wishlist' },
    { icon: 'time-outline', label: 'Browsing History', sublabel: 'Recently viewed products', action: 'history' },
  ];

  const SUPPORT_ITEMS = [
    { icon: 'notifications-outline', label: t('notifications'), action: 'notifications' },
    { icon: 'shield-checkmark-outline', label: pinEnabled ? t('pinLockChange') : t('pinLock'), action: 'pin' },
    { icon: 'headset-outline', label: t('support'), action: 'support' },
    { icon: 'document-text-outline', label: t('termsPrivacy'), action: 'terms' },
  ];

  const handleMenuTap = async (action: string) => {
    if (!isAuthenticated) {
      Toast.show({ type: 'info', text1: t('signInToAccess') });
      return;
    }
    if (action === 'notifications') router.push('/(customer)/notifications');
    else if (action === 'addresses') router.push('/(customer)/addresses' as any);
    else if (action === 'coupons') router.push('/(customer)/coupons' as any);
    else if (action === 'wishlist') router.push('/(customer)/products' as any);
    else if (action === 'history') router.push('/(customer)/browsing-history' as any);
    else if (action === 'wallet') Toast.show({ type: 'info', text1: 'Wallet coming soon' });
    else if (action === 'info') router.push('/(customer)/my-information' as any);
    else if (action === 'support') router.push('/(customer)/support' as any);
    else if (action === 'terms') Toast.show({ type: 'info', text1: 'Terms coming soon' });
    else if (action === 'pin') {
      if (pinEnabled) {
        await clearPin();
        setPinEnabled(false);
        Toast.show({ type: 'success', text1: t('pinEnabled') });
        router.push('/(auth)/pin-setup');
      } else {
        router.push('/(auth)/pin-setup');
      }
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;
    await Share.share({
      message: `Join AM Mart and get a discount on your first order! Use my referral code: ${referralCode}`,
    });
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
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/(customer)/my-information' as any)}>
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
              <Text style={styles.statValue}>{orderCount !== null ? orderCount : '...'}</Text>
              <Text style={styles.statLabel}>{t('ordersCount')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(customer)/coupons' as any)}>
              <Ionicons name="pricetag-outline" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{couponCount}</Text>
              <Text style={styles.statLabel}>{t('myCoupons')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem}>
              <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
              <Text style={styles.statValue}>{walletBalance !== null ? `${currency}${walletBalance.toLocaleString()}` : '...'}</Text>
              <Text style={styles.statLabel}>{t('walletBalance')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Referral Card — authenticated only */}
        {isAuthenticated && referralCode && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <Ionicons name="gift-outline" size={22} color={Colors.primary} />
              <Text style={styles.referralTitle}>{t('referFriend')}</Text>
            </View>
            <Text style={styles.referralSub}>{t('referFriendSub')}</Text>
            <View style={styles.referralCodeRow}>
              <Text style={styles.referralCode}>{referralCode}</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShareReferral}>
                <Ionicons name="share-social-outline" size={16} color="#fff" />
                <Text style={styles.shareBtnText}>{t('share')}</Text>
              </TouchableOpacity>
            </View>
            {referredCount > 0 && (
              <Text style={styles.referralStats}>
                {referredCount} friend{referredCount !== 1 ? 's' : ''} referred • {referredCount} coupon{referredCount !== 1 ? 's' : ''} earned
              </Text>
            )}
          </View>
        )}

        {/* Language — dropdown with search */}
        <TouchableOpacity style={styles.card} onPress={() => setShowLangPicker(true)} activeOpacity={0.8}>
          <View style={styles.langPickerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="language-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.langPickerInfo}>
              <Text style={styles.cardLabel}>{t('language')}</Text>
              <Text style={styles.langPickerCurrent}>
                {currentLang ? `${currentLang.flag}  ${currentLang.name}` : language}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <LanguagePickerModal
          visible={showLangPicker}
          onClose={() => setShowLangPicker(false)}
          isFirstRun={false}
        />

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

        <Text style={styles.version}>{t('appVersion')}</Text>
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
  langPickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  langPickerInfo: { flex: 1 },
  langPickerCurrent: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
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
  // Referral card
  referralCard: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xl,
    padding: Spacing.base, gap: 10, ...Shadow.sm,
  },
  referralHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  referralTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  referralSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)' },
  referralCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  referralCode: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base, paddingVertical: 10,
    fontSize: FontSize.lg, fontWeight: FontWeight.extrabold,
    color: '#fff', letterSpacing: 2, textAlign: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: Spacing.base,
    paddingVertical: 10, borderRadius: BorderRadius.lg,
  },
  shareBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  referralStats: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
