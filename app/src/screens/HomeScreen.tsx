import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

const { width } = Dimensions.get('window');

interface Product {
  id: string; name: string; price: number; image: string; status: string;
}

interface Banner {
  id: string; title: string; description: string; url: string; image: string | null;
  textColor?: string | null; textAlign?: string | null;
}

const categories = [
  { id: 'snowrun', title: '스노우런', icon: '⚡', screen: 'SnowRun' },
  { id: 'coupon', title: '쿠폰샵', icon: '🎟️', screen: 'CouponShop' },
  { id: 'skishop', title: '스키샵', icon: '🏪', screen: 'SkiShop' },
  { id: 'repair', title: '정비', icon: '🔧', screen: 'Repair' },
  { id: 'used', title: '중고거래', icon: '🏷️', screen: 'Used' },
  { id: 'rental', title: '렌탈', icon: '⛷️', screen: 'Rental' },
  { id: 'lesson', title: '레슨', icon: '🎿', screen: 'Lesson' },
  { id: 'accommodation', title: '숙소', icon: '🏨', screen: 'Accommodation' },
];

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [hotDeals, setHotDeals] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIdx, setBannerIdx] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [b, h] = await Promise.all([
        api<Banner[]>('/banners').catch(() => []),
        api<Product[]>('/home/hot-deals').catch(() => []),
      ]);
      setBanners(Array.isArray(b) ? b : []);
      setHotDeals(Array.isArray(h) ? h : []);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIdx(p => (p + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}>
      {/* 배너 */}
      {banners.length > 0 && (
        <View style={s.banner}>
          {banners[bannerIdx]?.image && (
            <Image source={{ uri: banners[bannerIdx].image! }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          )}
          <View style={[s.bannerContent, { alignItems: banners[bannerIdx]?.textAlign === 'center' ? 'center' : banners[bannerIdx]?.textAlign === 'right' ? 'flex-end' : 'flex-start' }]}>
            <Text style={[s.bannerTitle, banners[bannerIdx]?.textColor ? { color: banners[bannerIdx].textColor! } : {}]}>{banners[bannerIdx]?.title}</Text>
            <Text style={[s.bannerDesc, banners[bannerIdx]?.textColor ? { color: banners[bannerIdx].textColor!, opacity: 0.8 } : {}]}>{banners[bannerIdx]?.description}</Text>
          </View>
          <Text style={s.bannerCount}>{bannerIdx + 1}/{banners.length}</Text>
          <Text style={s.bannerAd}>AD</Text>
        </View>
      )}

      {/* 카테고리 */}
      <View style={s.catGrid}>
        {categories.map(cat => (
          <TouchableOpacity key={cat.id} style={s.catItem} onPress={() => nav.navigate(cat.screen)} activeOpacity={0.7}>
            <View style={s.catIcon}><Text style={{ fontSize: 24 }}>{cat.icon}</Text></View>
            <Text style={s.catLabel}>{cat.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 인기 중고매물 */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>🏷️ 중고 인기매물</Text>
          <TouchableOpacity onPress={() => nav.navigate('Used')}><Text style={s.sectionMore}>더보기 &gt;</Text></TouchableOpacity>
        </View>
        {hotDeals.map(deal => (
          <TouchableOpacity key={deal.id} style={s.dealItem} onPress={() => nav.navigate('UsedDetail', { id: deal.id })} activeOpacity={0.7}>
            <View style={s.dealImage}>
              {(deal.image?.startsWith('http') || deal.image?.startsWith('/')) ? (
                <Image source={{ uri: deal.image.startsWith('/') ? `${require('../utils/api').SERVER_URL}${deal.image}` : deal.image }} style={{ width: 56, height: 56, borderRadius: 8 }} />
              ) : <Text style={{ fontSize: 24 }}>{deal.image || '📷'}</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.dealName} numberOfLines={1}>{deal.name}</Text>
              <Text style={s.dealPrice}>{deal.price.toLocaleString()}원</Text>
            </View>
          </TouchableOpacity>
        ))}
        {hotDeals.length === 0 && <Text style={s.empty}>아직 등록된 매물이 없습니다.</Text>}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  banner: { height: 120, marginHorizontal: 16, marginTop: 12, borderRadius: 16, backgroundColor: '#E0F2FE', overflow: 'hidden', justifyContent: 'center' },
  bannerContent: { padding: 20, zIndex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  bannerDesc: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  bannerCount: { position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: '#9ca3af', backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  bannerAd: { position: 'absolute', bottom: 8, left: 12, fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff' },
  catItem: { width: width / 5 - 6, alignItems: 'center', marginBottom: 12 },
  catIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, borderColor: '#7DD3FC', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '600', color: '#1e293b', marginTop: 6 },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#BAE6FD', padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  sectionMore: { fontSize: 12, color: '#0EA5E9', fontWeight: '500' },
  dealItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dealImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dealName: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  dealPrice: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 13, paddingVertical: 16 },
});
