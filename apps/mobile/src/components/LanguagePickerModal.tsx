/**
 * LanguagePickerModal
 *
 * Used in two places:
 *  1. First-run overlay — shown once on first install
 *  2. Profile screen — user taps "Language" to open it
 *
 * Features:
 *  • Search field with no dropdown arrow
 *  • All 10 languages shown as a scrollable list
 *  • Selected language highlighted with a tick
 *  • Fully responsive layout
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGUAGES, Language, useLanguage } from '../i18n';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** When true — shows a Continue button instead of auto-close; used for first-run */
  isFirstRun?: boolean;
}

export function LanguagePickerModal({ visible, onClose, isFirstRun = false }: Props) {
  const { language, setLanguage, t, completeFirstRun } = useLanguage();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Language>(language);

  const filtered = useMemo(() => {
    if (!query.trim()) return LANGUAGES;
    const q = query.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.label.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  const handleSelect = async (code: Language) => {
    setSelected(code);
    await setLanguage(code);
    if (!isFirstRun) {
      // In profile mode — close immediately after selection
      setQuery('');
      onClose();
    }
  };

  const handleContinue = async () => {
    await completeFirstRun();
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType={isFirstRun ? 'fade' : 'slide'}
      transparent={!isFirstRun}
      onRequestClose={isFirstRun ? undefined : onClose}
      statusBarTranslucent
    >
      {isFirstRun ? (
        /* ── Full-screen first-run picker ── */
        <SafeAreaView style={styles.fullScreen}>
          <View style={styles.fullHeader}>
            <Text style={styles.fullTitle}>{t('selectLanguage')}</Text>
            <Text style={styles.fullSub}>{t('selectLanguageSubtitle')}</Text>
          </View>

          {/* Search — no arrow, no icon prefix caret */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchLanguage')}
              placeholderTextColor={Colors.textLight}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(l) => l.code}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isActive = selected === item.code;
              return (
                <TouchableOpacity
                  style={[styles.langRow, isActive && styles.langRowActive]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <View style={styles.langInfo}>
                    <Text style={[styles.langName, isActive && styles.langNameActive]}>
                      {item.name}
                    </Text>
                    <Text style={styles.langLabel}>{item.label}</Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
              <Text style={styles.continueBtnText}>{t('continueBtn')}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        /* ── Bottom-sheet profile picker ── */
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search — no arrow */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchLanguage')}
                placeholderTextColor={Colors.textLight}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {query.length > 0 && Platform.OS === 'android' && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(l) => l.code}
              style={styles.sheetList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isActive = selected === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.langRow, isActive && styles.langRowActive]}
                    onPress={() => handleSelect(item.code)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.flag}>{item.flag}</Text>
                    <View style={styles.langInfo}>
                      <Text style={[styles.langName, isActive && styles.langNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.langLabel}>{item.label}</Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Full screen (first run) ───────────────────────────────────────────────────
  fullScreen: { flex: 1, backgroundColor: '#fff' },
  fullHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  fullTitle:  { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.text },
  fullSub:    { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 6 },

  // ── Bottom sheet (profile) ────────────────────────────────────────────────────
  overlay:    { flex: 1, justifyContent: 'flex-end' },
  backdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 24,
  },
  sheetHandle:{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  sheetTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  closeBtn:   { padding: 4 },
  sheetList:  { maxHeight: 380 },

  // ── Search ────────────────────────────────────────────────────────────────────
  searchBox:  {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.lg, marginBottom: 8,
    backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  searchInput:{ flex: 1, fontSize: FontSize.base, color: Colors.text },

  // ── Language list ─────────────────────────────────────────────────────────────
  list:       { flex: 1 },
  langRow:    {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
  },
  langRowActive:{ backgroundColor: Colors.primary + '0D' },
  flag:       { fontSize: 26 },
  langInfo:   { flex: 1 },
  langName:   { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  langNameActive: { color: Colors.primary },
  langLabel:  { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  sep:        { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.lg },

  // ── Continue button (first run) ───────────────────────────────────────────────
  bottomBar:  { paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: Spacing.sm },
  continueBtn:{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, height: 54,
    borderRadius: BorderRadius['2xl'], ...Shadow.md,
  },
  continueBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
