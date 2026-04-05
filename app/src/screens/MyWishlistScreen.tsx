import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { api, getUser, SERVER_URL } from '../utils/api';

interface Product {
  id: string; name: string; brand: string; price: number; image: string; status: string;
}

export default function MyWishlistScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const user = await getUser();
    if (!user) { navigation.navigate('Login'); return; }
    setLoading(true);
    try {
      const d = await api<Product[]>('/products/wishlist');
      setProducts(Array.isArray(d) ? d : []);
    } catch { setProducts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const imgSrc = (img: string) => img.startsWith('http') ? img : img.startsWith('/') ? `${SERVER_URL}${img}` : '';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>찜 목록</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('UsedDetail', { id: item.id })} activeOpacity={0.7}>
            <View style={s.cardImg}>
              {imgSrc(item.image) ? <Image source={{ uri: imgSrc(item.image) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 24 }}>📷</Text>}
            </View>
            <View style={s.cardContent}>
              <Text style={s.brand}>{item.brand}</Text>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.price}>{item.price.toLocaleString()}원</Text>
              {item.status !== 'selling' && (
                <Text style={s.statusLabel}>{item.status === 'reserved' ? '예약중' : '판매완료'}</Text>
              )}
            </View>
            <Text style={s.heart}>♥</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>찜한 상품이 없습니다.</Text> : null}
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
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', overflow: 'hidden', marginBottom: 10, alignItems: 'center' },
  cardImg: { width: 90, height: 90, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, padding: 12 },
  brand: { fontSize: 11, color: '#0EA5E9', fontWeight: '500' },
  name: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 4 },
  statusLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  heart: { fontSize: 20, color: '#F43F5E', paddingRight: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
