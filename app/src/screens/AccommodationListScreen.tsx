import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../utils/api';

interface Accommodation {
  id: string; name: string; resort: string; type: string;
  pricePerNight?: number; description?: string; phone?: string; address?: string;
}

const PAGE_SIZE = 12;
const resorts = ['all', '용평', '하이원', '비발디', '휘닉스', '지산', '곤지암', '무주', '에덴밸리', '오투'];
const types = ['all', 'pension', 'hotel', 'condo', 'minbak', 'etc'];
const typeLabels: Record<string, string> = { all: '전체', pension: '펜션', hotel: '호텔', condo: '콘도', minbak: '민박', etc: '기타' };

export default function AccommodationListScreen({ navigation }: any) {
  const [items, setItems] = useState<Accommodation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resort, setResort] = useState('all');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [resort, type]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (resort !== 'all') params.set('resort', resort);
    if (type !== 'all') params.set('type', type);
    api<{ items: Accommodation[]; totalCount: number }>(`/accommodations?${params}`)
      .then(d => { setItems(d.items || []); setTotal(d.totalCount || 0); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [resort, type, page]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>숙소 목록</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        horizontal
        data={resorts}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, paddingHorizontal: 16, paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setResort(item)} style={[s.filterBtn, resort === item && s.filterActive]}>
            <Text style={[s.filterText, resort === item && s.filterTextActive]}>{item === 'all' ? '전체' : item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        horizontal
        data={types}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setType(item)} style={[s.filterBtn, type === item && s.filterActive]}>
            <Text style={[s.filterText, type === item && s.filterTextActive]}>{typeLabels[item]}</Text>
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
            <View style={s.cardTop}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.typeBadge}>{typeLabels[item.type] || item.type}</Text>
            </View>
            <Text style={s.resort}>{item.resort}</Text>
            {item.pricePerNight != null && <Text style={s.price}>1박 {item.pricePerNight.toLocaleString()}원~</Text>}
            {item.address && <Text style={s.address}>{item.address}</Text>}
            {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
            {item.phone && <Text style={s.phone}>{item.phone}</Text>}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>숙소 정보가 없습니다.</Text> : null}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  typeBadge: { fontSize: 11, fontWeight: '600', color: '#38BDF8', backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginLeft: 8 },
  resort: { fontSize: 12, color: '#0EA5E9', fontWeight: '500', marginTop: 4 },
  price: { fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 6 },
  address: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  desc: { fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 20 },
  phone: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
