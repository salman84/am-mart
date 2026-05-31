import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supportApi } from '../../src/services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

const CATEGORIES = [
  { key: 'ORDER',   label: 'Order Issue',   icon: 'receipt-outline' },
  { key: 'SIM',     label: 'SIM Card',      icon: 'phone-portrait-outline' },
  { key: 'TOPUP',   label: 'Top-Up',        icon: 'phone-landscape-outline' },
  { key: 'PAYMENT', label: 'Payment',        icon: 'card-outline' },
  { key: 'ACCOUNT', label: 'Account',        icon: 'person-outline' },
  { key: 'PRODUCT', label: 'Product',        icon: 'cube-outline' },
  { key: 'OTHER',   label: 'Other',          icon: 'help-circle-outline' },
] as const;

const STATUS_COLOR: Record<string, string> = {
  OPEN:        '#F59E0B',
  IN_PROGRESS: '#3B82F6',
  RESOLVED:    '#10B981',
  CLOSED:      '#9CA3AF',
};

export default function SupportScreen() {
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string>('OTHER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  useEffect(() => {
    if (tab === 'history') {
      loadTickets();
    }
  }, [tab]);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await supportApi.getMyTickets();
      setTickets(res.data?.tickets || res.data || []);
    } catch {
      setTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) { Toast.show({ type: 'error', text1: 'Please enter a subject' }); return; }
    if (!message.trim()) { Toast.show({ type: 'error', text1: 'Please describe your issue' }); return; }
    setIsSubmitting(true);
    try {
      await supportApi.createTicket({ subject: subject.trim(), message: message.trim(), category });
      Toast.show({ type: 'success', text1: 'Ticket submitted!', text2: 'We\'ll get back to you soon.' });
      setSubject('');
      setMessage('');
      setCategory('OTHER');
      setTab('history');
      loadTickets();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to submit ticket' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, tab === 'new' && styles.tabActive]} onPress={() => setTab('new')}>
          <Ionicons name="create-outline" size={16} color={tab === 'new' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New Ticket</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
          <Ionicons name="time-outline" size={16} color={tab === 'history' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>My Tickets</Text>
        </TouchableOpacity>
      </View>

      {tab === 'new' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="headset-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoText}>
                Tell us about your issue and our team will respond within 24 hours.
              </Text>
            </View>

            {/* Category */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.catChip, category === cat.key && styles.catChipActive]}
                    onPress={() => setCategory(cat.key)}
                  >
                    <Ionicons name={cat.icon as any} size={16} color={category === cat.key ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.catText, category === cat.key && styles.catTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Subject */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of the issue"
                placeholderTextColor={Colors.textLight}
                maxLength={120}
              />
            </View>

            {/* Message */}
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue in detail…"
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{message.length}/2000</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.disabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Ticket</Text>
                </>
              )}
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* History Tab */
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isLoadingTickets ? (
            <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
          ) : tickets.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={56} color={Colors.textLight} />
              <Text style={styles.emptyText}>No tickets yet</Text>
              <Text style={styles.emptySub}>Your support requests will appear here</Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[ticket.status] || '#9CA3AF' }]} />
                  <Text style={[styles.statusText, { color: STATUS_COLOR[ticket.status] || '#9CA3AF' }]}>
                    {ticket.status?.replace('_', ' ')}
                  </Text>
                  <Text style={styles.ticketDate}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                <Text style={styles.ticketMsg} numberOfLines={2}>{ticket.message}</Text>
                {ticket.replies?.length > 0 && (
                  <View style={styles.replyBadge}>
                    <Ionicons name="chatbubble-outline" size={12} color={Colors.primary} />
                    <Text style={styles.replyCount}>{ticket.replies.length} reply</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12 },
  headerTitle:     { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content:         { padding: Spacing.base, gap: 14, paddingBottom: 40 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText:       { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  emptySub:        { fontSize: FontSize.sm, color: Colors.textLight },

  tabBar:          { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  tab:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive:       { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText:         { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabTextActive:   { color: Colors.primary, fontWeight: FontWeight.bold },

  infoBanner:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg, padding: Spacing.base },
  infoText:        { flex: 1, fontSize: FontSize.sm, color: Colors.primary, lineHeight: 20 },

  card:            { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, gap: 10 },
  fieldLabel:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },

  categoryGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  catChipActive:   { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  catText:         { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  catTextActive:   { color: Colors.primary, fontWeight: FontWeight.bold },

  input:           { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: 12, paddingVertical: 11, fontSize: FontSize.sm, color: Colors.text, backgroundColor: Colors.background },
  textarea:        { minHeight: 120, paddingTop: 12 },
  charCount:       { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'right' },

  submitBtn:       { backgroundColor: Colors.primary, height: 54, borderRadius: BorderRadius['2xl'], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText:   { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
  disabled:        { opacity: 0.6 },

  ticketCard:      { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, ...Shadow.sm, gap: 6 },
  ticketHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusText:      { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  ticketDate:      { flex: 1, textAlign: 'right', fontSize: FontSize.xs, color: Colors.textLight },
  ticketSubject:   { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  ticketMsg:       { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  replyBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  replyCount:      { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
});
