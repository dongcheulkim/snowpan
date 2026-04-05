import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { api, SERVER_URL } from '../utils/api';

interface Product {
  id: string; name: string; brand: string; price: number; image: string; status: string; isPremium?: boolean;
}

const PAGE_SIZE = 12;
const categories = ['all', 'ski', 'board', 'boots', 'binding', 'helmet', 'goggles', 'wear', 'etc'];
const catLabels: Record<string, string> = { all: '전체', ski: '스키', board: '보드', boots: '부츠', binding: '바인딩', helmet: '헬멧', goggles: '고글', wear: '의류', etc: '기타' };

export default function UsedListScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [cat, debounced]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ category: 'used', limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
    if (cat !== 'all') params.set('subcategory', cat);
    if (debounced) params.set('search', debounced);
    api<{ products: Product[]; totalCount: number }>(`/products?${params}`)
      .then(d => { setProducts(d.products); setTotal(d.totalCount); })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [cat, debounced, page]);

  const imgSrc = (img: string) => img.startsWith('http') ? img : img.startsWith('/') ? `${SERVER_URL}${img}` : '';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>중고장터</Text>
        <TouchableOpacity onPress={() => navigation.navigate('UsedRegister')} style={s.regBtn}><Text style={s.regText}>+ 등록</Text></TouchableOpacity>
      </View>

      <TextInput style={s.search} placeholder="검색..." placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />

      <FlatList
        horizontal
        data={categories}
        keyExtractor={i => i}
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 8, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setCat(item)} style={[s.catBtn, cat === item && s.catActive]}>
            <Text style={[s.catText, cat === item && s.catTextActive]}>{catLabels[item]}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={() => setPage(1)}
        onEndReached={() => { if (products.length < total) setPage(p => p + 1); }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('UsedDetail', { id: item.id })} activeOpacity={0.7}>
            <View style={s.cardImg}>
              {imgSrc(item.image) ? <Image source={{ uri: imgSrc(item.image) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 28 }}>📷</Text>}
              {item.isPremium && <View style={s.adBadge}><Text style={s.adText}>AD</Text></View>}
              {item.status !== 'selling' && <View style={s.statusBadge}><Text style={s.statusText}>{item.status === 'reserved' ? '예약중' : '판매완료'}</Text></View>}
            </View>
            <View style={{ padding: 8 }}>
              <Text style={s.brand}>{item.brand}</Text>
              <Text style={s.name} numberOfLines={1}>{item.name}</Text>
              <Text style={s.price}>{item.price.toLocaleString()}원</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>상품이 없습니다.</Text> : null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  regBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  regText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  search: { marginHorizontal: 16, marginVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1e293b' },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 6 },
  catActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  catText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  catTextActive: { color: '#fff' },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', overflow: 'hidden', marginBottom: 8 },
  cardImg: { height: 100, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  adBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(245,158,11,0.8)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  adText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  statusBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  brand: { fontSize: 10, color: '#0EA5E9', fontWeight: '500' },
  name: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '800', color: '#10B981', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
