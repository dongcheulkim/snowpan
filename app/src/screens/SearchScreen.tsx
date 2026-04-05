import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../utils/api';

interface SearchResult {
  products: { id: string; name: string; price: number; brand: string }[];
  posts: { id: string; title: string; category: string }[];
  shops: { id: string; name: string; area: string; type: string }[];
}

const categoryMap: Record<string, string> = { free: '자유', review: '장비리뷰', resort: '스키장', tip: '초보팁' };

export default function SearchScreen({ navigation }: any) {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(query), 300); return () => clearTimeout(t); }, [query]);

  useEffect(() => {
    if (!debounced) { setResults(null); return; }
    setLoading(true);
    api<SearchResult>(`/search?q=${encodeURIComponent(debounced)}`).then(setResults).catch(() => setResults(null)).finally(() => setLoading(false));
  }, [debounced]);

  const hasResults = results && (results.products.length > 0 || results.posts.length > 0 || results.shops.length > 0);

  const allItems: any[] = [];
  if (results?.products.length) allItems.push({ type: 'header', title: '🏷️ 중고장비' }, ...results.products.map(p => ({ ...p, type: 'product' })));
  if (results?.posts.length) allItems.push({ type: 'header', title: '💬 커뮤니티' }, ...results.posts.map(p => ({ ...p, type: 'post' })));
  if (results?.shops.length) allItems.push({ type: 'header', title: '🏪 스키샵·정비샵' }, ...results.shops.map(s => ({ ...s, type: 'shop' })));

  return (
    <View style={s.container}>
      <View style={s.searchBar}>
        <Text style={{ fontSize: 16, color: '#9ca3af' }}>🔍</Text>
        <TextInput ref={inputRef} style={s.input} value={query} onChangeText={setQuery} placeholder="장비, 게시글, 스키샵 검색..." placeholderTextColor="#9ca3af" />
        {query ? <TouchableOpacity onPress={() => { setQuery(''); setResults(null); }}><Text style={{ color: '#9ca3af' }}>✕</Text></TouchableOpacity> : null}
      </View>

      {!debounced && !loading && (
        <View style={s.placeholder}><Text style={{ fontSize: 40 }}>🔍</Text><Text style={s.placeholderText}>중고장비, 커뮤니티 글, 스키샵을 검색해보세요</Text></View>
      )}
      {loading && <Text style={s.status}>검색 중...</Text>}
      {!loading && debounced && !hasResults && <View style={s.placeholder}><Text style={{ fontSize: 32 }}>😅</Text><Text style={s.placeholderText}>"{debounced}"에 대한 결과가 없습니다.</Text></View>}

      {hasResults && (
        <FlatList
          data={allItems}
          keyExtractor={(item, i) => `${item.type}-${item.id || i}`}
          renderItem={({ item }) => {
            if (item.type === 'header') return <Text style={s.header}>{item.title}</Text>;
            if (item.type === 'product') return (
              <TouchableOpacity style={s.item} onPress={() => navigation.navigate('UsedDetail', { id: item.id })}>
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.itemPrice}>{item.price?.toLocaleString()}원</Text>
              </TouchableOpacity>
            );
            if (item.type === 'post') return (
              <TouchableOpacity style={s.item} onPress={() => navigation.navigate('CommunityDetail', { id: item.id })}>
                <Text style={s.badge}>{categoryMap[item.category] || item.category}</Text>
                <Text style={s.itemName} numberOfLines={1}>{item.title}</Text>
              </TouchableOpacity>
            );
            return (
              <TouchableOpacity style={s.item}><Text style={{ fontSize: 14 }}>{item.type === 'ski' ? '🏪' : '🔧'}</Text><Text style={s.itemName}>{item.name}</Text><Text style={s.itemSub}>{item.area}</Text></TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  placeholder: { alignItems: 'center', paddingVertical: 60 },
  placeholderText: { fontSize: 13, color: '#9ca3af', marginTop: 12 },
  status: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
  header: { fontSize: 12, fontWeight: '800', color: '#6b7280', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 4, borderRadius: 10 },
  itemName: { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  itemPrice: { fontSize: 13, color: '#0EA5E9', fontWeight: '700' },
  itemSub: { fontSize: 11, color: '#9ca3af' },
  badge: { fontSize: 10, color: '#6b7280', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
});
