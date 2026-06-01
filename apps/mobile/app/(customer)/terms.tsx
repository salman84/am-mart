import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../src/theme';

const SECTIONS = [
  {
    title: 'Terms of Service',
    icon: 'document-text-outline',
    content: `Welcome to AM Mart. By using our app and services, you agree to these terms.

1. Use of Service
You may use AM Mart to browse products, place orders, and manage your account. You agree not to misuse the service or help others do so.

2. Account Registration
You must provide accurate information when creating an account. You are responsible for keeping your account credentials secure.

3. Orders & Payments
All orders are subject to product availability. Prices are shown in the selected currency and may change without notice. Payment must be completed at checkout.

4. Delivery
We aim to deliver within the estimated timeframe shown at checkout. Delays may occur due to external factors beyond our control.

5. Returns & Refunds
Eligible items may be returned within 7 days of delivery. Contact our support team to initiate a return.

6. Prohibited Items
You may not list, sell, or purchase any prohibited or illegal items through AM Mart.

7. Termination
We reserve the right to suspend or terminate your account for violations of these terms.`,
  },
  {
    title: 'Privacy Policy',
    icon: 'shield-checkmark-outline',
    content: `Your privacy is important to us. This policy explains how we collect and use your data.

1. Information We Collect
- Personal details (name, phone, email, address)
- Order history and transaction data
- Device information and app usage analytics

2. How We Use Your Data
- To process and deliver your orders
- To send order updates and notifications
- To improve our service and user experience
- To comply with legal obligations

3. Data Sharing
We do not sell your personal data. We may share data with delivery partners and payment processors strictly to fulfil your orders.

4. Data Security
Your data is stored securely using industry-standard encryption. Payment data is processed by certified payment providers.

5. Your Rights
You may request to view, correct, or delete your personal data at any time by contacting our support team.

6. Cookies & Analytics
Our app may use analytics tools to understand usage patterns. No personally identifiable information is shared with analytics providers.

7. Contact
For privacy concerns, reach out to our support team through the Help & Support section.`,
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Ionicons name="shield-half-outline" size={32} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Your trust matters</Text>
            <Text style={styles.bannerSub}>Last updated: June 2025</Text>
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconWrap}>
                <Ionicons name={section.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If you have questions about our terms or privacy policy, please contact our support team.
          </Text>
          <TouchableOpacity
            style={styles.supportBtn}
            onPress={() => router.push('/(customer)/support' as any)}
          >
            <Ionicons name="headset-outline" size={18} color={Colors.primary} />
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn:       { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:   { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center' },
  content:       { padding: Spacing.base, gap: 14, paddingBottom: 40 },

  banner:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.xl, padding: Spacing.base },
  bannerTitle:   { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primary },
  bannerSub:     { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2, opacity: 0.7 },

  card:          { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap:      { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:  { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  sectionBody:   { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

  footer:        { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, alignItems: 'center', gap: 12 },
  footerText:    { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  supportBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius['2xl'] },
  supportBtnText:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
});
