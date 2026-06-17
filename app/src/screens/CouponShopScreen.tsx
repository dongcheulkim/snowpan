// 쿠폰샵 — 포인트로 매장 할인 쿠폰 구매.
// 구매 시 AdMob 보상형 광고 시청 필수 (백엔드 게이트 + 클라 흐름 통합).

import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image,
  Modal, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import { showRewardedAd } from '../utils/admob';

interface Coupon {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  partnerType: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  image: string | null;
  validDays: number;
  stock: number | null;
}

const TYPE_LABEL: Record<string, string> = {
  rental: '렌탈', lesson: '강습', skishop: '스키샵',
  accommodation: '숙소', repair: '정비', general: '전체',
};
const TYPES: { id: string; label: string }[] = [
  { id: '', label: '전체' },
  { id: 'rental', label: '렌탈' },
  { id: 'lesson', label: '강습' },
  { id: 'skishop', label: '스키샵' },
  { id: 'accommodation', label: '숙소' },
  { id: 'repair', label: '정비' },
];

export default function CouponShopScreen() {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [partnerType, setPartnerType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<Coupon | null>(null);
  const [buying, setBuying] = useState(false);

  const loadBalance = () => api<{ balance: number }>('/points/balance').then((b) => setBalance(b.balance)).catch(() => {});
  const loadCoupons = (type: string) => {
    setLoading(true);
    const qs = type ? `?partnerType=${type}` : '';
    return api<{ coupons: Coupon[] }>(`/coupons${qs}`)
      .then((r) => setCoupons(r.coupons))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBalance(); }, []);
  useEffect(() => { loadCoupons(partnerType); }, [partnerType]);

  const discountLabel = (c: Coupon) =>
    c.discountType === 'percent' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`;

  const confirmPurchase = (c: Coupon) => {
    if (balance === null) { Alert.alert('로그인 필요', '로그인 후 이용 가능합니다.'); return; }
    if (balance < c.pointsCost) {
      Alert.alert('포인트 부족', `보유 ${balance.toLocaleString()}P · 필요 ${c.pointsCost.toLocaleString()}P`);
      return;
    }
    setConfirmTarget(c);
  };

  const doPurchase = async () => {
    if (!confirmTarget) return;
    setBuying(true);
    try {
      // 1) 광고 시청.
      const adResult = await showRewardedAd('coupon_purchase');
      if (!adResult.ok) {
        Alert.alert('광고 시청 필요', adResult.reason);
        return;
      }

      // 2) 구매 (백엔드가 최근 AdView consume).
      await api(`/coupons/${confirmTarget.id}/purchase`, { method: 'POST' });
      Alert.alert('구매 완료', '쿠폰이 발급되었습니다. "내 쿠폰"에서 확인하세요.');
      setConfirmTarget(null);
      await loadBalance();
    } catch (e) {
      Alert.alert('구매 실패', (e as Error).message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* 잔액 + 내쿠폰 진입 */}
        <View style={st.balanceBar}>
          <View>
            <Text style={st.balanceLabel}>내 포인트</Text>
            <Text style={st.balanceBig}>{balance === null ? '— P' : `${balance.toLocaleString()}P`}</Text>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('MyCoupons')} style={st.myBtn}>
            <Text style={st.myBtnText}>내 쿠폰 →</Text>
          </TouchableOpacity>
        </View>

        {/* 필터 칩 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {TYPES.map((t) => {
            const active = partnerType === t.id;
            return (
              <TouchableOpacity
                key={t.id || 'all'}
                onPress={() => setPartnerType(t.id)}
                style={[st.chip, active && st.chipActive]}
              >
                <Text style={[st.chipText, active && st.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 쿠폰 목록 */}
        <View style={{ marginTop: 16, gap: 12 }}>
          {loading ? (
            <ActivityIndicator color="#0F172A" style={{ paddingVertical: 40 }} />
          ) : coupons.length === 0 ? (
            <Text style={st.empty}>조건에 맞는 쿠폰이 없습니다.</Text>
          ) : (
            coupons.map((c) => {
              const insufficient = balance !== null && balance < c.pointsCost;
              const soldOut = c.stock !== null && c.stock <= 0;
              const disabled = soldOut || insufficient;
              return (
                <View key={c.id} style={st.couponCard}>
                  <View style={st.couponImg}>
                    {c.image ? <Image source={{ uri: c.image }} style={{ width: '100%', height: '100%', borderRadius: 8 }} /> : <Text style={{ fontSize: 28 }}>🎟️</Text>}
                  </View>
                  <View style={{ flex: 1, minHeight: 80, justifyContent: 'space-between' }}>
                    <View>
                      <View style={st.tagRow}>
                        <Text style={st.tag}>{TYPE_LABEL[c.partnerType] || c.partnerType}</Text>
                        <Text style={st.discount}>{discountLabel(c)}</Text>
                      </View>
                      <Text style={st.couponTitle} numberOfLines={1}>{c.title}</Text>
                      {c.description && <Text style={st.couponDesc} numberOfLines={2}>{c.description}</Text>}
                    </View>
                    <View style={st.priceRow}>
                      <Text style={st.priceBig}>{c.pointsCost.toLocaleString()}P</Text>
                      <TouchableOpacity
                        disabled={disabled}
                        onPress={() => confirmPurchase(c)}
                        style={[st.buyBtn, disabled && st.buyBtnDisabled]}
                      >
                        <Text style={[st.buyBtnText, disabled && st.buyBtnTextDisabled]}>
                          {soldOut ? '매진' : insufficient ? '포인트 부족' : '구매하기'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 구매 확인 모달 — 광고 시청 안내 */}
      <Modal visible={confirmTarget !== null} transparent animationType="fade" onRequestClose={() => !buying && setConfirmTarget(null)}>
        <Pressable style={st.modalBg} onPress={() => !buying && setConfirmTarget(null)}>
          <Pressable style={st.modal}>
            <Text style={st.modalIcon}>📺</Text>
            <Text style={st.modalTitle}>광고 시청 후 구매</Text>
            <Text style={st.modalBody}>
              짧은 광고(15~30초)를 끝까지 시청하면 쿠폰이 발급됩니다.
              {confirmTarget && `\n\n${confirmTarget.title}\n${confirmTarget.pointsCost.toLocaleString()}P 차감`}
            </Text>
            <View style={st.modalBtnRow}>
              <TouchableOpacity style={st.modalCancel} onPress={() => setConfirmTarget(null)} disabled={buying}>
                <Text style={st.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.modalConfirm} onPress={doPurchase} disabled={buying}>
                {buying ? <ActivityIndicator color="#fff" /> : <Text style={st.modalConfirmText}>광고 보고 구매</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  balanceBar: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { color: '#9CA3AF', fontSize: 11 },
  balanceBig: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 2 },
  myBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  myBtnText: { color: '#0F172A', fontWeight: '700', fontSize: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#6B7280', fontSize: 13, paddingVertical: 40 },
  couponCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', gap: 12 },
  couponImg: { width: 80, height: 80, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { fontSize: 10, fontWeight: '700', color: '#374151', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  discount: { fontSize: 10, fontWeight: '700', color: '#059669' },
  couponTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  couponDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  priceBig: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  buyBtn: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  buyBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  buyBtnDisabled: { backgroundColor: '#E5E7EB' },
  buyBtnTextDisabled: { color: '#9CA3AF' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  modalBody: { fontSize: 13, color: '#374151', textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 8, width: '100%' },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalCancelText: { color: '#374151', fontWeight: '700' },
  modalConfirm: { flex: 1, backgroundColor: '#0F172A', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '900' },
});
