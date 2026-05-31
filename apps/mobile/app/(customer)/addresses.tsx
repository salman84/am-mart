import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../../src/services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow } from '../../src/theme';
import Toast from 'react-native-toast-message';

// ─── Constants ───────────────────────────────────────────────────────────────
const LABELS = ['Home', 'Work', 'Other'];

const EMPTY_FORM = {
  label:                'Home',
  fullName:             '',
  phone:                '',
  addressLine1:         '',
  addressLine2:         '',
  city:                 '',
  district:             '',
  postalCode:           '',
  isDefault:            false,
  deliveryGeneral:      '',
  deliveryLockerCode:   '',
  deliveryOtherNote:    '',
  gateCode:             '',
  deliveryDawn:         '',
  deliveryDawnSub:      '',
  deliveryDawnCode:     '',
  deliveryDawnNotify:   '',
  deliveryDawnOtherNote:'',
};
type FormType = typeof EMPTY_FORM;

const GENERAL_OPTIONS = [
  { value: 'doorstep',  label: 'Doorstep delivery (Leave in front of door)' },
  { value: 'in_person', label: 'In person (Leave at doorstep in my absence)' },
  { value: 'security',  label: 'Security office/Concierge (Doorstep inaccessible)' },
  { value: 'locker',    label: 'Delivery locker' },
  { value: 'other',     label: 'Other' },
];
const DAWN_OPTIONS = [
  { value: 'doorstep', label: 'Doorstep delivery (No phone call)' },
  { value: 'locker',   label: 'Delivery locker' },
  { value: 'other',    label: 'Other' },
];
const DAWN_SUB_OPTIONS = [
  { value: 'access_code',    label: 'Access code' },
  { value: 'front_desk',     label: 'Contact front desk/security for access' },
  { value: 'call_apartment', label: 'Call my apartment' },
  { value: 'no_restriction', label: 'No access restrictions' },
];
const DAWN_NOTIFY_OPTIONS = [
  { value: 'before_7am',     label: 'Before 7 AM',          note: '' },
  { value: 'after_delivery', label: 'Right after delivery',  note: 'There may be calls starting from midnight.' },
];

// ─── Summary helpers ─────────────────────────────────────────────────────────
function generalSummary(addr: Partial<FormType>): string {
  switch (addr.deliveryGeneral) {
    case 'doorstep':  return 'Doorstep delivery (Leave in front of door)';
    case 'in_person': return 'In person (Leave at doorstep in my absence)';
    case 'security':  return 'Security office/Concierge';
    case 'locker':    return addr.deliveryLockerCode ? `Delivery locker: ${addr.deliveryLockerCode}` : 'Delivery locker';
    case 'other':     return addr.deliveryOtherNote  || 'Other';
    default:          return '';
  }
}
function dawnSubLabel(sub: string, code: string): string {
  switch (sub) {
    case 'access_code':    return code ? `Access code: ${code}` : 'Access code';
    case 'front_desk':     return 'Contact front desk/security for access';
    case 'call_apartment': return 'Call my apartment';
    case 'no_restriction': return 'No access restrictions';
    default:               return '';
  }
}
function dawnSummary(addr: Partial<FormType>): string {
  switch (addr.deliveryDawn) {
    case 'doorstep': {
      const sub = dawnSubLabel(addr.deliveryDawnSub || '', addr.deliveryDawnCode || '');
      return sub ? `Doorstep delivery (No phone call) (${sub})` : 'Doorstep delivery (No phone call)';
    }
    case 'locker': return 'Delivery locker';
    case 'other':  return addr.deliveryDawnOtherNote || 'Other';
    default:       return '';
  }
}
function addressDeliverySummary(addr: any): string {
  const gen  = generalSummary(addr);
  const dawn = dawnSummary(addr);
  if (gen && dawn) return `Standard: ${gen} / Dawn: ${dawn}`;
  if (gen)         return `Standard: ${gen}`;
  if (dawn)        return `Dawn: ${dawn}`;
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Korean Address Search Modal
// ─────────────────────────────────────────────────────────────────────────────
function KoreanAddressSearchModal({ visible, apiKey, onClose, onSelect }: {
  visible: boolean; apiKey: string;
  onClose: () => void;
  onSelect: (a: { addressLine1: string; city: string; district: string; postalCode: string }) => void;
}) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query.trim())}&size=15`;
      const res  = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
      const data = await res.json();
      setResults(data.documents || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Address search failed. Check your API key.' });
      setResults([]);
    } finally { setLoading(false); }
  };

  const pick = (doc: any) => {
    const road = doc.road_address; const jibun = doc.address; const main = road || jibun;
    onSelect({ addressLine1: main?.address_name || doc.address_name || '', city: main?.region_1depth_name || '', district: main?.region_2depth_name || '', postalCode: road?.zone_no || '' });
    setQuery(''); setResults([]); setSearched(false);
  };
  const handleClose = () => { setQuery(''); setResults([]); setSearched(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={srchSt.root} edges={['top']}>
        <View style={srchSt.header}>
          <TouchableOpacity onPress={handleClose} style={srchSt.closeBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
          <Text style={srchSt.title}>도로명주소 검색</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={srchSt.searchRow}>
          <TextInput style={srchSt.input} placeholder="e.g. 강남구 테헤란로 or Gangnam" placeholderTextColor={Colors.textLight} value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search" autoFocus />
          <TouchableOpacity style={srchSt.searchBtn} onPress={search} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="search" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
        {!searched && <View style={srchSt.hintBox}><Ionicons name="information-circle-outline" size={18} color={Colors.primary} /><Text style={srchSt.hintText}>Type a road name, building name, or neighborhood in Korean or English, then tap Search.</Text></View>}
        {searched && !loading && results.length === 0 && <View style={srchSt.empty}><Ionicons name="location-outline" size={40} color={Colors.textLight} /><Text style={srchSt.emptyTxt}>No results found. Try a different keyword.</Text></View>}
        <FlatList data={results} keyExtractor={(_, i) => String(i)} contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const road = item.road_address; const jibun = item.address;
            return (
              <TouchableOpacity style={srchSt.resultCard} onPress={() => pick(item)} activeOpacity={0.7}>
                {road  && <View style={srchSt.resultRow}><View style={srchSt.roadBadge}><Text style={srchSt.roadBadgeTxt}>Road</Text></View><Text style={srchSt.resultAddr}>{road.address_name}</Text></View>}
                {jibun && <View style={srchSt.resultRow}><View style={srchSt.jibunBadge}><Text style={srchSt.jibunBadgeTxt}>지번</Text></View><Text style={srchSt.resultAddrSub}>{jibun.address_name}</Text></View>}
                {road?.zone_no ? <Text style={srchSt.postalTxt}>Postal: {road.zone_no}</Text> : null}
              </TouchableOpacity>
            );
          }} />
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// General Delivery Modal
// ─────────────────────────────────────────────────────────────────────────────
function GeneralDeliveryModal({ visible, initialValues, onClose, onSave }: {
  visible: boolean;
  initialValues: Pick<FormType, 'deliveryGeneral'|'deliveryLockerCode'|'deliveryOtherNote'|'gateCode'>;
  onClose: () => void;
  onSave: (v: Pick<FormType, 'deliveryGeneral'|'deliveryLockerCode'|'deliveryOtherNote'|'gateCode'>) => void;
}) {
  const [general,     setGeneral]     = useState('');
  const [lockerCode,  setLockerCode]  = useState('');
  const [otherNote,   setOtherNote]   = useState('');
  const [gateCode,    setGateCode]    = useState('');
  const [hasGateCode, setHasGateCode] = useState(true);

  useEffect(() => {
    if (visible) {
      setGeneral(initialValues.deliveryGeneral || '');
      setLockerCode(initialValues.deliveryLockerCode || '');
      setOtherNote(initialValues.deliveryOtherNote || '');
      const gc = initialValues.gateCode || '';
      setGateCode(gc);
      setHasGateCode(true); // default Yes pre-selected (matches reference)
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={dlvSt.root} edges={['top']}>
        <View style={dlvSt.header}>
          <TouchableOpacity onPress={onClose} style={dlvSt.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
          <Text style={dlvSt.headerTitle}>Delivery instructions</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={dlvSt.scroll} showsVerticalScrollIndicator={false}>
          <View style={dlvSt.notice}>
            <Text style={dlvSt.noticeTxt}>For social distancing, all items will be delivered without contact / contactless. Even if you select 'receive in person, or leave at the door if absent,' delivery will be made to the doorstep.</Text>
          </View>

          {GENERAL_OPTIONS.map((opt) => (
            <View key={opt.value}>
              <TouchableOpacity style={dlvSt.optionRow} onPress={() => setGeneral(opt.value)} activeOpacity={0.7}>
                <View style={[dlvSt.radio, general === opt.value && dlvSt.radioOn]}>{general === opt.value && <View style={dlvSt.radioDot} />}</View>
                <Text style={dlvSt.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
              {opt.value === 'locker' && general === 'locker' && (
                <View style={dlvSt.subSection}>
                  <Text style={dlvSt.subNote}>It is only used for standard delivery.</Text>
                  <TextInput style={dlvSt.subInput} placeholder="Delivery locker code (required)" placeholderTextColor={Colors.textLight} value={lockerCode} onChangeText={setLockerCode} />
                </View>
              )}
              {opt.value === 'other' && general === 'other' && (
                <View style={dlvSt.subSection}>
                  <TextInput style={dlvSt.subInput} placeholder="Please enter delivery instructions" placeholderTextColor={Colors.textLight} value={otherNote} onChangeText={setOtherNote} multiline />
                </View>
              )}
            </View>
          ))}

          <View style={dlvSt.divider} />

          <View style={dlvSt.sectionBox}>
            <View style={dlvSt.sectionHeaderRow}>
              <Text style={dlvSt.sectionTitle}>Apartment gate code</Text>
            </View>
            <View style={dlvSt.gateRow}>
              <TouchableOpacity onPress={() => setHasGateCode(true)} style={dlvSt.gateRadioPress}>
                <View style={[dlvSt.radio, hasGateCode && dlvSt.radioOn]}>{hasGateCode && <View style={dlvSt.radioDot} />}</View>
              </TouchableOpacity>
              <Text style={[dlvSt.optionLabel, { marginRight: 8 }]}>Yes</Text>
              {hasGateCode && (
                <TextInput style={dlvSt.gateInput} placeholder="#1234" placeholderTextColor={Colors.textLight} value={gateCode} onChangeText={setGateCode} />
              )}
            </View>
            <TouchableOpacity style={dlvSt.optionRow} onPress={() => { setHasGateCode(false); setGateCode(''); }} activeOpacity={0.7}>
              <View style={[dlvSt.radio, !hasGateCode && dlvSt.radioOn]}>{!hasGateCode && <View style={dlvSt.radioDot} />}</View>
              <Text style={dlvSt.optionLabel}>No apartment gate code needed</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={dlvSt.footer}>
          <TouchableOpacity style={dlvSt.agreeBtn} onPress={() => onSave({ deliveryGeneral: general, deliveryLockerCode: lockerCode, deliveryOtherNote: otherNote, gateCode: hasGateCode ? gateCode : '' })}>
            <Text style={dlvSt.agreeBtnTxt}>Agree and save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dawn Delivery Modal
// ─────────────────────────────────────────────────────────────────────────────
function DawnDeliveryModal({ visible, initialValues, onClose, onSave }: {
  visible: boolean;
  initialValues: Pick<FormType, 'deliveryDawn'|'deliveryDawnSub'|'deliveryDawnCode'|'deliveryDawnNotify'|'deliveryDawnOtherNote'>;
  onClose: () => void;
  onSave: (v: Pick<FormType, 'deliveryDawn'|'deliveryDawnSub'|'deliveryDawnCode'|'deliveryDawnNotify'|'deliveryDawnOtherNote'>) => void;
}) {
  const [dawn,      setDawn]      = useState('');
  const [dawnSub,   setDawnSub]   = useState('');
  const [dawnCode,  setDawnCode]  = useState('');
  const [notify,    setNotify]    = useState('');
  const [otherNote, setOtherNote] = useState('');
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    if (visible) {
      setDawn(initialValues.deliveryDawn || '');
      setDawnSub(initialValues.deliveryDawnSub || '');
      setDawnCode(initialValues.deliveryDawnCode || '');
      setNotify(initialValues.deliveryDawnNotify || '');
      setOtherNote(initialValues.deliveryDawnOtherNote || '');
      setCodeError(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (dawn === 'doorstep' && dawnSub === 'access_code' && !dawnCode.trim()) {
      setCodeError(true); return;
    }
    onSave({ deliveryDawn: dawn, deliveryDawnSub: dawnSub, deliveryDawnCode: dawnCode, deliveryDawnNotify: notify, deliveryDawnOtherNote: otherNote });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={dlvSt.root} edges={['top']}>
        <View style={dlvSt.header}>
          <TouchableOpacity onPress={onClose} style={dlvSt.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
          <Text style={dlvSt.headerTitle}>Dawn Delivery instructions</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={dlvSt.scroll} showsVerticalScrollIndicator={false}>
          <View style={dlvSt.notice}>
            <Text style={dlvSt.noticeTxt}>For social distancing, all items will be delivered without contact / contactless. Even if you select 'receive in person, or leave at the door if absent,' delivery will be made to the doorstep.</Text>
          </View>

          <View style={dlvSt.sectionBox}>
            <View style={dlvSt.sectionHeaderRow}>
              <Text style={dlvSt.sectionTitle}>Dawn Delivery option</Text>
              <Text style={dlvSt.requiredTag}>Required</Text>
            </View>

            {DAWN_OPTIONS.map((opt) => (
              <View key={opt.value}>
                <TouchableOpacity style={dlvSt.optionRow} onPress={() => { setDawn(opt.value); if (opt.value !== 'doorstep') setDawnSub(''); }} activeOpacity={0.7}>
                  <View style={[dlvSt.radio, dawn === opt.value && dlvSt.radioOn]}>{dawn === opt.value && <View style={dlvSt.radioDot} />}</View>
                  <Text style={dlvSt.optionLabel}>{opt.label}</Text>
                </TouchableOpacity>

                {opt.value === 'doorstep' && dawn === 'doorstep' && (
                  <View style={dlvSt.subOptionsWrap}>
                    {DAWN_SUB_OPTIONS.map((sub) => (
                      <View key={sub.value}>
                        <TouchableOpacity style={dlvSt.subOptionRow} onPress={() => { setDawnSub(sub.value); setCodeError(false); }} activeOpacity={0.7}>
                          <View style={[dlvSt.radioSm, dawnSub === sub.value && dlvSt.radioSmOn]}>{dawnSub === sub.value && <View style={dlvSt.radioDotSm} />}</View>
                          <Text style={dlvSt.subOptionLabel}>{sub.label}</Text>
                        </TouchableOpacity>
                        {sub.value === 'access_code' && dawnSub === 'access_code' && (
                          <View style={dlvSt.codeWrap}>
                            <TextInput style={[dlvSt.subInput, codeError && { borderColor: Colors.danger }]} placeholder="e.g. #1234" placeholderTextColor={Colors.textLight} value={dawnCode} onChangeText={(v) => { setDawnCode(v); setCodeError(false); }} />
                            {codeError && <Text style={dlvSt.codeError}>This is a required field.</Text>}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {opt.value === 'other' && dawn === 'other' && (
                  <View style={dlvSt.subSection}>
                    <TextInput style={dlvSt.subInput} placeholder="Please enter delivery instructions" placeholderTextColor={Colors.textLight} value={otherNote} onChangeText={setOtherNote} multiline />
                  </View>
                )}
              </View>
            ))}

            <View style={dlvSt.notesList}>
              <Text style={dlvSt.notesItem}>• When early morning access is not allowed, items may be delivered in front of the first-floor entrance.</Text>
              <Text style={dlvSt.notesItem}>• I agree that the entered apartment gate code is the information required for Dawn Delivery and will be retained for the necessary duration for future deliveries.</Text>
            </View>
          </View>

          <View style={dlvSt.divider} />

          <View style={dlvSt.sectionBox}>
            <View style={dlvSt.sectionHeaderRow}>
              <Text style={dlvSt.sectionTitle}>Text notifications for Dawn Delivery</Text>
              <Text style={dlvSt.requiredTag}>Required</Text>
            </View>
            {DAWN_NOTIFY_OPTIONS.map((opt) => (
              <View key={opt.value}>
                <TouchableOpacity style={dlvSt.optionRow} onPress={() => setNotify(opt.value)} activeOpacity={0.7}>
                  <View style={[dlvSt.radio, notify === opt.value && dlvSt.radioOn]}>{notify === opt.value && <View style={dlvSt.radioDot} />}</View>
                  <Text style={dlvSt.optionLabel}>{opt.label}</Text>
                </TouchableOpacity>
                {opt.note && notify === opt.value && <Text style={dlvSt.optionNote}>{opt.note}</Text>}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={dlvSt.footer}>
          <TouchableOpacity style={dlvSt.agreeBtn} onPress={handleSave}>
            <Text style={dlvSt.agreeBtnTxt}>Agree and save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AddressesScreen() {
  const [addresses, setAddresses]     = useState<any[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [showSearch, setShowSearch]   = useState(false);
  const [showGeneral, setShowGeneral] = useState(false);
  const [showDawn, setShowDawn]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState<FormType>({ ...EMPTY_FORM });

  const featureAddressSearch = useSelector((s: RootState) => (s.appSettings as any)?.featureAddressSearch !== false);
  const kakaoApiKey          = useSelector((s: RootState) => (s.appSettings as any)?.kakaoApiKey || '');
  const authUser             = useSelector((s: RootState) => s.auth.user);

  const load = useCallback(async () => {
    try {
      const res = await userApi.getAddresses();
      setAddresses(res.data.addresses || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load addresses' });
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, fullName: (authUser as any)?.fullName || '', phone: (authUser as any)?.phone || '' });
    setShowModal(true);
  };

  const openEdit = (addr: any) => {
    setEditId(addr.id);
    setForm({
      label:                addr.label                || 'Home',
      fullName:             addr.fullName             || '',
      phone:                addr.phone                || '',
      addressLine1:         addr.addressLine1         || '',
      addressLine2:         addr.addressLine2         || '',
      city:                 addr.city                 || '',
      district:             addr.district             || '',
      postalCode:           addr.postalCode           || '',
      isDefault:            addr.isDefault            || false,
      deliveryGeneral:      addr.deliveryGeneral      || '',
      deliveryLockerCode:   addr.deliveryLockerCode   || '',
      deliveryOtherNote:    addr.deliveryOtherNote    || '',
      gateCode:             addr.gateCode             || '',
      deliveryDawn:         addr.deliveryDawn         || '',
      deliveryDawnSub:      addr.deliveryDawnSub      || '',
      deliveryDawnCode:     addr.deliveryDawnCode     || '',
      deliveryDawnNotify:   addr.deliveryDawnNotify   || '',
      deliveryDawnOtherNote: addr.deliveryDawnOtherNote || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.addressLine1.trim()) { Toast.show({ type: 'error', text1: 'Address is required' }); return; }
    if (!form.city.trim())         { Toast.show({ type: 'error', text1: 'City is required' }); return; }
    setSaving(true);
    try {
      const payload: any = {
        label:                form.label,
        fullName:             form.fullName.trim()            || undefined,
        phone:                form.phone.trim()               || undefined,
        addressLine1:         form.addressLine1.trim(),
        addressLine2:         form.addressLine2.trim()        || undefined,
        city:                 form.city.trim(),
        district:             form.district.trim()            || undefined,
        postalCode:           form.postalCode.trim()          || undefined,
        isDefault:            form.isDefault,
        deliveryGeneral:      form.deliveryGeneral            || undefined,
        deliveryLockerCode:   form.deliveryLockerCode         || undefined,
        deliveryOtherNote:    form.deliveryOtherNote          || undefined,
        gateCode:             form.gateCode                   || undefined,
        deliveryDawn:         form.deliveryDawn               || undefined,
        deliveryDawnSub:      form.deliveryDawnSub            || undefined,
        deliveryDawnCode:     form.deliveryDawnCode           || undefined,
        deliveryDawnNotify:   form.deliveryDawnNotify         || undefined,
        deliveryDawnOtherNote: form.deliveryDawnOtherNote     || undefined,
      };
      if (editId) {
        await userApi.updateAddress(editId, payload);
        Toast.show({ type: 'success', text1: 'Address updated' });
      } else {
        await userApi.addAddress(payload);
        Toast.show({ type: 'success', text1: 'Address saved' });
      }
      setShowModal(false);
      await load();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Failed to save address' });
    } finally { setSaving(false); }
  };

  const handleDelete = (addr: any) => {
    Alert.alert('Delete Address', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await userApi.deleteAddress(addr.id);
          setAddresses((prev) => prev.filter((a) => a.id !== addr.id));
          Toast.show({ type: 'success', text1: 'Address removed' });
        } catch { Toast.show({ type: 'error', text1: 'Failed to delete address' }); }
      }},
    ]);
  };

  const handleSetDefault = async (addr: any) => {
    try {
      await userApi.updateAddress(addr.id, { isDefault: true });
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addr.id })));
      Toast.show({ type: 'success', text1: 'Default address updated' });
    } catch { Toast.show({ type: 'error', text1: 'Failed to update default' }); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={56} color={Colors.textLight} />
          <Text style={styles.emptyTitle}>No addresses yet</Text>
          <Text style={styles.emptySubtitle}>Add your delivery address to speed up checkout</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const delivSummary = addressDeliverySummary(item);
            return (
              <View style={[styles.card, item.isDefault && styles.cardDefault]}>
                <View style={styles.cardLeft}>
                  <View style={styles.labelRow}>
                    <View style={styles.labelBadge}>
                      <Ionicons name={item.label === 'Work' ? 'briefcase-outline' : item.label === 'Other' ? 'location-outline' : 'home-outline'} size={12} color={Colors.primary} />
                      <Text style={styles.labelText}>{item.label || 'Home'}</Text>
                    </View>
                    {item.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
                  </View>
                  {item.fullName    ? <Text style={styles.recipientName}>{item.fullName}</Text>  : null}
                  <Text style={styles.street}>{item.addressLine1}</Text>
                  {item.addressLine2 ? <Text style={styles.street2}>{item.addressLine2}</Text>  : null}
                  <Text style={styles.cityTxt}>{[item.district, item.city, item.postalCode].filter(Boolean).join(', ')}</Text>
                  {item.phone       ? <Text style={styles.phoneTxt}>{item.phone}</Text>          : null}
                  {delivSummary     ? <Text style={styles.delivSummaryTxt}>{delivSummary}</Text> : null}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}><Ionicons name="pencil-outline" size={18} color={Colors.primary} /></TouchableOpacity>
                  {!item.isDefault && <TouchableOpacity onPress={() => handleSetDefault(item)} style={styles.actionBtn}><Ionicons name="star-outline" size={18} color="#F59E0B" /></TouchableOpacity>}
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}><Ionicons name="trash-outline" size={18} color={Colors.danger} /></TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Korean address search */}
      <KoreanAddressSearchModal
        visible={showSearch} apiKey={kakaoApiKey} onClose={() => setShowSearch(false)}
        onSelect={(a) => { setForm((f) => ({ ...f, addressLine1: a.addressLine1, city: a.city, district: a.district, postalCode: a.postalCode })); setShowSearch(false); }}
      />

      {/* General delivery modal */}
      <GeneralDeliveryModal
        visible={showGeneral}
        initialValues={{ deliveryGeneral: form.deliveryGeneral, deliveryLockerCode: form.deliveryLockerCode, deliveryOtherNote: form.deliveryOtherNote, gateCode: form.gateCode }}
        onClose={() => setShowGeneral(false)}
        onSave={(v) => { setForm((f) => ({ ...f, ...v })); setShowGeneral(false); }}
      />

      {/* Dawn delivery modal */}
      <DawnDeliveryModal
        visible={showDawn}
        initialValues={{ deliveryDawn: form.deliveryDawn, deliveryDawnSub: form.deliveryDawnSub, deliveryDawnCode: form.deliveryDawnCode, deliveryDawnNotify: form.deliveryDawnNotify, deliveryDawnOtherNote: form.deliveryDawnOtherNote }}
        onClose={() => setShowDawn(false)}
        onSave={(v) => { setForm((f) => ({ ...f, ...v })); setShowDawn(false); }}
      />

      {/* Add / Edit modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Edit Address' : 'Add Address'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              {/* Label */}
              <Text style={styles.fieldLabel}>Label</Text>
              <View style={styles.labelRow2}>
                {LABELS.map((l) => (
                  <TouchableOpacity key={l} style={[styles.labelChip, form.label === l && styles.labelChipActive]} onPress={() => setForm((f) => ({ ...f, label: l }))}>
                    <Text style={[styles.labelChipText, form.label === l && styles.labelChipTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Recipient */}
              <Text style={styles.fieldLabel}>Recipient Name</Text>
              <TextInput style={styles.input} placeholder="Name of the person receiving delivery" placeholderTextColor={Colors.textLight} value={form.fullName} onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))} />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.input} placeholder="e.g. 010-1234-5678" placeholderTextColor={Colors.textLight} value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />

              {/* Korean address search */}
              {featureAddressSearch && kakaoApiKey ? (
                <TouchableOpacity style={styles.searchBtn} onPress={() => setShowSearch(true)}>
                  <Ionicons name="search" size={18} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchBtnTitle}>Search Korean Address</Text>
                    <Text style={styles.searchBtnSub}>도로명주소 자동검색</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              ) : null}

              {/* Address fields */}
              <Text style={styles.fieldLabel}>Address Line 1 <Text style={{ color: Colors.danger }}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Road address (도로명주소)" placeholderTextColor={Colors.textLight} value={form.addressLine1} onChangeText={(v) => setForm((f) => ({ ...f, addressLine1: v }))} />

              <Text style={styles.fieldLabel}>Address Line 2</Text>
              <TextInput style={styles.input} placeholder="Apartment, floor, unit (optional)" placeholderTextColor={Colors.textLight} value={form.addressLine2} onChangeText={(v) => setForm((f) => ({ ...f, addressLine2: v }))} />

              <Text style={styles.fieldLabel}>City <Text style={{ color: Colors.danger }}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Seoul" placeholderTextColor={Colors.textLight} value={form.city} onChangeText={(v) => setForm((f) => ({ ...f, city: v }))} />

              <Text style={styles.fieldLabel}>District / Gu</Text>
              <TextInput style={styles.input} placeholder="e.g. Gangnam-gu" placeholderTextColor={Colors.textLight} value={form.district} onChangeText={(v) => setForm((f) => ({ ...f, district: v }))} />

              <Text style={styles.fieldLabel}>Postal Code</Text>
              <TextInput style={styles.input} placeholder="e.g. 06000" placeholderTextColor={Colors.textLight} value={form.postalCode} onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))} keyboardType="number-pad" />

              {/* Delivery preference selectors */}
              <View style={styles.dlvDivider} />

              <TouchableOpacity style={styles.dlvPrefRow} onPress={() => setShowGeneral(true)} activeOpacity={0.7}>
                <Ionicons name="bicycle-outline" size={20} color={form.deliveryGeneral ? Colors.primary : Colors.textSecondary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  {form.deliveryGeneral ? (
                    <>
                      <Text style={styles.dlvPrefSet}>Standard delivery</Text>
                      <Text style={styles.dlvPrefValue} numberOfLines={1}>{generalSummary(form)}</Text>
                    </>
                  ) : (
                    <Text style={styles.dlvPrefPlaceholder}>Please select your General Delivery preference.</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.dlvPrefRow} onPress={() => setShowDawn(true)} activeOpacity={0.7}>
                <Ionicons name="moon-outline" size={20} color={form.deliveryDawn ? Colors.primary : Colors.textSecondary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  {form.deliveryDawn ? (
                    <>
                      <Text style={styles.dlvPrefSet}>Dawn delivery</Text>
                      <Text style={styles.dlvPrefValue} numberOfLines={1}>{dawnSummary(form)}</Text>
                    </>
                  ) : (
                    <Text style={styles.dlvPrefPlaceholder}>Please select your Dawn-Delivery preference.</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>

              {/* Default toggle */}
              <TouchableOpacity style={styles.defaultToggle} onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}>
                <Ionicons name={form.isDefault ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={form.isDefault ? Colors.primary : Colors.border} />
                <Text style={styles.defaultToggleText}>Set as default address</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>{editId ? 'Update Address' : 'Save Address'}</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Korean search styles ────────────────────────────────────────────────────
const srchSt = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  closeBtn:      { width: 40, height: 40, justifyContent: 'center' },
  title:         { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  searchRow:     { flexDirection: 'row', gap: 10, padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  input:         { flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 11, fontSize: FontSize.sm, color: Colors.text },
  searchBtn:     { width: 46, height: 46, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  hintBox:       { flexDirection: 'row', gap: 8, margin: Spacing.base, padding: Spacing.base, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg, alignItems: 'flex-start' },
  hintText:      { flex: 1, fontSize: FontSize.xs, color: Colors.primary, lineHeight: 18 },
  empty:         { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt:      { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  resultCard:    { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginTop: 8, borderWidth: 1, borderColor: Colors.borderLight, gap: 4 },
  resultRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roadBadge:     { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: Colors.primary, borderRadius: 4 },
  roadBadgeTxt:  { fontSize: 10, color: '#fff', fontWeight: FontWeight.bold },
  jibunBadge:    { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: Colors.borderLight, borderRadius: 4 },
  jibunBadgeTxt: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.bold },
  resultAddr:    { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  resultAddrSub: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  postalTxt:     { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
});

// ─── Delivery modal styles ───────────────────────────────────────────────────
const dlvSt = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  backBtn:        { width: 40, height: 40, justifyContent: 'center' },
  headerTitle:    { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  scroll:         { paddingBottom: 32 },
  notice:         { margin: Spacing.base, padding: Spacing.base, backgroundColor: '#FFF9E6', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#F0E080' },
  noticeTxt:      { fontSize: FontSize.xs, color: '#7A6000', lineHeight: 18 },
  optionRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  radio:          { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CCCCCC', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioOn:        { borderColor: Colors.primary },
  radioDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  optionLabel:    { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  subSection:     { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.base, backgroundColor: '#F8F8F8' },
  subNote:        { fontSize: FontSize.xs, color: Colors.textSecondary, paddingTop: Spacing.sm, paddingBottom: 6 },
  subInput:       { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.base, paddingHorizontal: 12, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.text, backgroundColor: Colors.surface },
  divider:        { height: 8, backgroundColor: '#F2F2F2' },
  sectionBox:     { backgroundColor: Colors.surface },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.base, paddingBottom: Spacing.sm },
  sectionTitle:   { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  requiredTag:    { fontSize: FontSize.xs, color: Colors.textSecondary },
  gateRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  gateRadioPress: { marginRight: 12 },
  gateInput:      { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.base, paddingHorizontal: 12, height: 40, fontSize: FontSize.sm, color: Colors.text },
  subOptionsWrap: { paddingLeft: 46, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  subOptionRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingRight: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  radioSm:        { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#CCCCCC', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  radioSmOn:      { borderColor: Colors.primary },
  radioDotSm:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  subOptionLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  codeWrap:       { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, paddingLeft: 46, backgroundColor: '#FAFAFA' },
  codeError:      { fontSize: FontSize.xs, color: Colors.primary, marginTop: 4 },
  notesList:      { padding: Spacing.base, gap: 6 },
  notesItem:      { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  optionNote:     { fontSize: FontSize.xs, color: Colors.textSecondary, paddingLeft: Spacing.lg + 34, paddingBottom: Spacing.sm },
  footer:         { padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  agreeBtn:       { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center' },
  agreeBtnTxt:    { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});

// ─── Main screen styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  headerTitle:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: Spacing.xl },
  emptyTitle:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius['2xl'] },
  addBtnText:    { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  list:          { padding: Spacing.base },
  card:          { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm },
  cardDefault:   { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  cardLeft:      { flex: 1, gap: 3 },
  labelRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  labelBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  labelText:     { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
  defaultBadge:  { backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  defaultText:   { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.bold },
  recipientName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  street:        { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  street2:       { fontSize: FontSize.sm, color: Colors.textSecondary },
  cityTxt:       { fontSize: FontSize.xs, color: Colors.textSecondary },
  phoneTxt:      { fontSize: FontSize.xs, color: Colors.textSecondary },
  delivSummaryTxt:{ fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  cardActions:   { flexDirection: 'column', gap: 8, marginLeft: 8 },
  actionBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  // Modal
  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: 'center', marginTop: 12 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  modalContent:  { padding: Spacing.base, gap: 8, paddingBottom: 40 },
  fieldLabel:    { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text, marginTop: 4 },
  input:         { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: FontSize.base, color: Colors.text },
  labelRow2:     { flexDirection: 'row', gap: 8, marginBottom: 4 },
  labelChip:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  labelChipActive:    { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  labelChipText:      { fontSize: FontSize.sm, color: Colors.textSecondary },
  labelChipTextActive:{ color: Colors.primary, fontWeight: FontWeight.semibold },
  searchBtn:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.base, paddingVertical: 12, backgroundColor: Colors.primaryLight, marginVertical: 4 },
  searchBtnTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  searchBtnSub:   { fontSize: FontSize.xs, color: Colors.primary, opacity: 0.7 },
  // Delivery preference selectors in form
  dlvDivider:    { height: 1, backgroundColor: Colors.borderLight, marginVertical: 8 },
  dlvPrefRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.base, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.lg, marginBottom: 8, backgroundColor: Colors.background },
  dlvPrefPlaceholder: { fontSize: FontSize.sm, color: Colors.textSecondary },
  dlvPrefSet:    { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold, marginBottom: 2 },
  dlvPrefValue:  { fontSize: FontSize.sm, color: Colors.text },
  // Default + save
  defaultToggle:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: Spacing.sm },
  defaultToggleText: { fontSize: FontSize.sm, color: Colors.text },
  saveBtn:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius['2xl'], marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
