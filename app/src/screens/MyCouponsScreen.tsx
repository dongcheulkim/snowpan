// 내 쿠폰 — 보유/사용/만료 탭 + 사용 처리.

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

interface UserCoupon {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired';
  expiresAt: string;
  usedAt: string | null;
  purchasedAt: string;
  coupon: {
    title: string;
    description: string | null;
    partnerType: string;
    discountType: 'percent' | 'flat';
    discountValue: number;
    image: string | null;
  };
}

const STATUS_TABS: { id: 'active' | 'used' | 'expired'; label: string }[] = [
  { id: 'active', label: '사용 가능' },
  { id: 'used', label: '사용 완료' },
  { id: 'expired', label: '만료' },
];

const TYPE_LABEL: Record<string, string> = {
  rental: '렌탈', lesson: '강습', skishop: '스키샵',
  accommodation: '숙소', repair: '정비', general: '전체',
};

export default function MyCouponsScreen() {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const [status, setStatus] = useState<'active' | 'used' | 'expired'>('active');
  const [items, setItems] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  const load = (s: typeof status) => {
    setLoading(true);
    api<{ items: UserCoupon[] }>(`/coupons/my?status=${s}`)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(status); }, [status]);

  const discountLabel = (c: UserCoupon['coupon']) =>
    c.discountType === 'percent' ? `${c.discountValue}% 할인` : `${c.discountValue.toLocaleString()}원 할인`;

  const onUse = (id: string) => {
    Alert.alert('쿠폰 사용', '이 쿠폰을 사용 처리하시겠습니까? 사용 후 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '사용', style: 'destructive',
        onPress: async () => {
          try {
            await api(`/coupons/my/${id}/use`, { method: 'POST' });
            Alert.alert('완료', '사용 처리되었습니다.');
            load(status);
          } catch (e) {
            Alert.alert('실패', (e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={st.head}>
        <Text style={st.title}>내 쿠폰</Text>
        <TouchableOpacity onPress={() => nav.navigate('CouponShop')} style={st.shopBtn}>
          <Text style={st.shopBtnText}>쿠폰샵 →</Text>
        </TouchableOpacity>
      </View>

      <View style={st.tabRow}>
        {STATUS_TABS.map((t) => {
          const active = status === t.id;
          return (
            <TouchableOpacity key={t.id} style={[st.tab, active && st.tabActive]} onPress={() => setStatus(t.id)}>
              <Text style={[st.tabText, active && st.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#0F172A" style={{ paddingVertical: 40 }} />
      ) : items.length === 0 ? (
        <Text style={st.empty}>{status === 'active' ? '사용 가능한 쿠폰이 없습니다.' : '해당 상태의 쿠폰이 없습니다.'}</Text>
      ) : (
        items.map((it) => (
          <View key={it.id} style={[st.card, it.status === 'active' ? st.cardActive : st.cardDim]}>
            <View style={st.tagRow}>
              <Text style={st.tag}>{TYPE_LABEL[it.coupon.partnerType] || it.coupon.partnerType}</Text>
              <Text style={st.discount}>{discountLabel(it.coupon)}</Text>
              {it.status === 'used' && <Text style={st.usedTag}>사용 완료</Text>}
              {it.status === 'expired' && <Text style={st.usedTag}>만료</Text>}
            </View>
            <Text style={st.cardTitle}>{it.coupon.title}</Text>
            {it.coupon.description && <Text style={st.cardDesc}>{it.coupon.description}</Text>}

            <View style={st.codeRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.codeLabel}>쿠폰 번호</Text>
                <Text style={st.code}>{it.code}</Text>
              </View>
              {it.status === 'active' && (
                <TouchableOpacity onPress={() => onUse(it.id)} style={st.useBtn}>
                  <Text style={st.useBtnText}>사용 처리</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={st.cardMeta}>
              {it.status === 'used' && it.usedAt
                ? `${new Date(it.usedAt).toLocaleDateString('ko-KR')} 사용`
                : `${new Date(it.expiresAt).toLocaleDateString('ko-KR')}까지`}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  shopBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  shopBtnText: { color: '#0F172A', fontSize: 12, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#0F172A' },
  tabText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  empty: { textAlign: 'center', color: '#6B7280', fontSize: 13, paddingVertical: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2 },
  cardActive: { borderColor: '#0F172A' },
  cardDim: { borderColor: '#E5E7EB', opacity: 0.7 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { fontSize: 10, fontWeight: '700', color: '#374151', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  discount: { fontSize: 10, fontWeight: '700', color: '#059669' },
  usedTag: { marginLeft: 'auto', fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginTop: 8 },
  cardDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  codeLabel: { fontSize: 10, color: '#6B7280' },
  code: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: 4, fontFamily: 'monospace' },
  useBtn: { backgroundColor: '#0F172A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  useBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardMeta: { fontSize: 10, color: '#9CA3AF', marginTop: 8 },
});
