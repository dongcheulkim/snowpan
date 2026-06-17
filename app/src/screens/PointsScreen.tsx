// 포인트 대시보드 — 잔액 + 적립 이력 + 쿠폰샵/내쿠폰 진입.

import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

interface Transaction {
  id: string;
  amount: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  signup_bonus: '회원가입 보너스',
  referral_bonus: '추천인 보너스',
  snow_run: '스노우런 적립',
  review: '리뷰 작성',
  daily_checkin: '일일 출석',
  coupon_purchase: '쿠폰 구매',
  coupon_refund: '쿠폰 환불',
  admin_grant: '관리자 지급',
  admin_deduct: '관리자 차감',
  expire: '포인트 만료',
};

export default function PointsScreen() {
  const nav = useNavigation<{ navigate: (name: string) => void }>();
  const [balance, setBalance] = useState<number | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ balance: number }>('/points/balance'),
      api<{ items: Transaction[] }>('/points/history?limit=30'),
    ])
      .then(([b, h]) => {
        setBalance(b.balance);
        setItems(h.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={st.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* 잔액 카드 */}
      <View style={st.heroCard}>
        <Text style={st.heroLabel}>사용 가능한 포인트</Text>
        <Text style={st.heroBig}>
          {balance === null ? '—' : balance.toLocaleString()}
          <Text style={st.heroBigUnit}> P</Text>
        </Text>
        <View style={st.btnRow}>
          <TouchableOpacity style={st.primaryBtn} onPress={() => nav.navigate('CouponShop')}>
            <Text style={st.primaryBtnText}>쿠폰 구매</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.secondaryBtn} onPress={() => nav.navigate('MyCoupons')}>
            <Text style={st.secondaryBtnText}>내 쿠폰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 적립 안내 */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>포인트 적립하기</Text>
        <Text style={st.guideItem}>• 회원가입 보너스 1,000P (1회)</Text>
        <Text style={st.guideItem}>• 추천인 가입 시 500P</Text>
        <Text style={st.guideItem}>• 스노우런 1회 100P (일 10회)</Text>
        <Text style={st.guideItem}>• 거래 후 리뷰 작성 200P</Text>
      </View>

      {/* 이력 */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>적립/사용 이력</Text>
        {loading ? (
          <ActivityIndicator color="#0F172A" style={{ paddingVertical: 20 }} />
        ) : items.length === 0 ? (
          <Text style={st.empty}>아직 이력이 없습니다.</Text>
        ) : (
          items.map((it, idx) => (
            <View key={it.id} style={[st.histItem, idx !== items.length - 1 && st.histBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={st.histTitle}>{it.description || SOURCE_LABEL[it.source] || it.source}</Text>
                <Text style={st.histDate}>
                  {new Date(it.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={it.amount > 0 ? st.amountPos : st.amountNeg}>
                  {it.amount > 0 ? '+' : ''}
                  {it.amount.toLocaleString()}P
                </Text>
                <Text style={st.histBalance}>잔액 {it.balanceAfter.toLocaleString()}P</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  heroCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20 },
  heroLabel: { color: '#9CA3AF', fontSize: 11 },
  heroBig: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
  heroBigUnit: { fontSize: 18, fontWeight: '700', color: '#D1D5DB' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  primaryBtn: { flex: 1, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 14 },
  secondaryBtn: { flex: 1, backgroundColor: '#1F2937', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  secondaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  guideItem: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  empty: { textAlign: 'center', color: '#6B7280', fontSize: 13, paddingVertical: 16 },
  histItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 10 },
  histBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  histTitle: { fontSize: 13, color: '#0F172A' },
  histDate: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  amountPos: { fontSize: 13, fontWeight: '700', color: '#059669' },
  amountNeg: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  histBalance: { fontSize: 10, color: '#6B7280', marginTop: 2 },
});
