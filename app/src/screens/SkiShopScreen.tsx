import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { api } from '../utils/api';

interface SkiShop {
  id: string; name: string; area: string; address?: string;
  phone?: string; description?: string; website?: string;
}

const areas = ['all', '서울', '경기', '강원', '충청', '경상', '전라', '제주'];

export default function SkiShopScreen({ navigation }: any) {
  const [items, setItems] = useState<SkiShop[]>([]);
  const [area, setArea] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (area !== 'all') params.set('area', area);
    api<SkiShop[]>(`/ski-shops?${params}`)
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [area]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>스키샵 목록</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        horizontal
        data={areas}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setArea(item)} style={[s.filterBtn, area === item && s.filterActive]}>
            <Text style={[s.filterText, area === item && s.filterTextActive]}>{item === 'all' ? '전체' : item}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={() => setLoading(true)}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.area}>{item.area}</Text>
            {item.address && <Text style={s.address}>{item.address}</Text>}
            {item.description && <Text style={s.desc} numberOfLines={2}>{item.description}</Text>}
            {item.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                <Text style={s.phone}>{item.phone}</Text>
              </TouchableOpacity>
            )}
            {item.website && (
              <TouchableOpacity onPress={() => Linking.openURL(item.website!)}>
                <Text style={s.website}>{item.website}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>스키샵 정보가 없습니다.</Text> : null}
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
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  area: { fontSize: 12, color: '#0EA5E9', fontWeight: '500', marginTop: 2 },
  address: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  desc: { fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 20 },
  phone: { fontSize: 13, color: '#38BDF8', fontWeight: '500', marginTop: 6 },
  website: { fontSize: 12, color: '#0EA5E9', marginTop: 4, textDecorationLine: 'underline' },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
