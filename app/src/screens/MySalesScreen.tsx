import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { api, getUser, SERVER_URL } from '../utils/api';

interface Product {
  id: string; name: string; brand: string; price: number; image: string; status: string;
}

const statusMap: Record<string, { label: string; bg: string; color: string }> = {
  selling: { label: '판매중', bg: '#DCFCE7', color: '#16A34A' },
  reserved: { label: '예약중', bg: '#FEF3C7', color: '#B45309' },
  sold: { label: '판매완료', bg: '#F3F4F6', color: '#6B7280' },
};

export default function MySalesScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const user = await getUser();
      if (!user) { navigation.navigate('Login'); return; }
      try {
        const d = await api<{ products: Product[]; totalCount: number }>(`/products?userId=me`);
        setProducts(d.products || []);
      } catch { setProducts([]); }
      setLoading(false);
    };
    load();
  }, []);

  const imgSrc = (img: string) => img.startsWith('http') ? img : img.startsWith('/') ? `${SERVER_URL}${img}` : '';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>판매 내역</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          api<{ products: Product[]; totalCount: number }>(`/products?userId=me`)
            .then(d => setProducts(d.products || []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
        }}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const st = statusMap[item.status] || statusMap.selling;
          return (
            <TouchableOpacity style={s.card} onPress={() => navigation.navigate('UsedDetail', { id: item.id })} activeOpacity={0.7}>
              <View style={s.cardImg}>
                {imgSrc(item.image) ? <Image source={{ uri: imgSrc(item.image) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 24 }}>📷</Text>}
              </View>
              <View style={s.cardContent}>
                <View style={s.cardTop}>
                  <Text style={s.brand}>{item.brand}</Text>
                  <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                <Text style={s.price}>{item.price.toLocaleString()}원</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading ? <Text style={s.empty}>판매 내역이 없습니다.</Text> : null}
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
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', overflow: 'hidden', marginBottom: 10 },
  cardImg: { width: 90, height: 90, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 11, color: '#0EA5E9', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  price: { fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
