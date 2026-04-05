import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../utils/api';

interface Rental {
  id: string; shopName: string; resort: string; description?: string;
  pricePerDay?: number; items?: string; phone?: string;
}

const PAGE_SIZE = 12;
const resorts = ['all', '용평', '하이원', '비발디', '휘닉스', '지산', '곤지암', '무주', '에덴밸리', '오투'];

export default function RentalListScreen({ navigation }: any) {
  const [items, setItems] = useState<Rental[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resort, setResort] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [resort]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (resort !== 'all') params.set('resort', resort);
    api<{ items: Rental[]; totalCount: number }>(`/rentals?${params}`)
      .then(d => { setItems(d.items || []); setTotal(d.totalCount || 0); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [resort, page]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>렌탈 목록</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        horizontal
        data={resorts}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setResort(item)} style={[s.filterBtn, resort === item && s.filterActive]}>
            <Text style={[s.filterText, resort === item && s.filterTextActive]}>{item === 'all' ? '전체' : item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={() => setPage(1)}
        onEndReached={() => { if (items.length < total) setPage(p => p + 1); }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.shopName}>{item.shopName}</Text>
            <Text style={s.resort}>{item.resort}</Text>
            {item.pricePerDay != null && <Text style={s.price}>일 {item.pricePerDay.toLocaleString()}원~</Text>}
            {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
            {item.phone && <Text style={s.phone}>{item.phone}</Text>}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>렌탈 정보가 없습니다.</Text> : null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#BAE6FD' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1e293b' },
  title: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6 },
  filterActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 16, marginBottom: 10 },
  shopName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  resort: { fontSize: 12, color: '#0EA5E9', fontWeight: '500', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 6 },
  desc: { fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 20 },
  phone: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
