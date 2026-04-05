import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api, getUser, SERVER_URL } from '../utils/api';

interface Product {
  id: string; name: string; brand: string; price: number; image: string; images?: string | null;
  description?: string | null; condition?: string | null; usageCount?: string | null; status?: string;
  wishlisted?: boolean; user?: { id: string; name: string; phone: string };
}

export default function UsedDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Product>(`/products/${id}`)
      .then(p => { setProduct(p); setWishlisted(!!p.wishlisted); })
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [id]);

  const toggleWishlist = async () => {
    try {
      const res = await api<{ wishlisted: boolean }>(`/products/${id}/wishlist`, { method: 'POST' });
      setWishlisted(res.wishlisted);
    } catch (e: any) { Alert.alert('', e.message); }
  };

  const startChat = async () => {
    const user = await getUser();
    if (!user) { navigation.navigate('Login'); return; }
    if (!product?.user) return;
    try {
      const room = await api<{ id: string }>('/chat/rooms', {
        method: 'POST', body: { targetUserId: product.user.id, productName: product.name },
      });
      navigation.navigate('Chat', { chatId: room.id, otherName: product.user.name });
    } catch (e: any) { Alert.alert('', e.message); }
  };

  if (loading || !product) return <View style={s.loading}><Text style={{ color: '#9ca3af' }}>로딩 중...</Text></View>;

  const imgSrc = (img: string) => img.startsWith('http') ? img : img.startsWith('/') ? `${SERVER_URL}${img}` : '';
  const allImages = product.images ? product.images.split(',').filter(Boolean) : product.image ? [product.image] : [];
  const condMap: Record<string, string> = { '상': '새상품', '상중': '거의 새 거', '중': '사용감 적음', '하': '사용감 많음' };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
      <ScrollView>
        {/* 이미지 */}
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: 280 }}>
          {allImages.map((img, i) => (
            <View key={i} style={{ width: 400, height: 280, backgroundColor: '#f1f5f9' }}>
              {imgSrc(img) ? <Image source={{ uri: imgSrc(img) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 40, textAlign: 'center', paddingTop: 100 }}>📷</Text>}
            </View>
          ))}
        </ScrollView>

        <View style={s.content}>
          {/* 상태 */}
          {product.status && product.status !== 'selling' && (
            <View style={[s.statusBadge, product.status === 'reserved' ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#F3F4F6' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: product.status === 'reserved' ? '#B45309' : '#6B7280' }}>
                {product.status === 'reserved' ? '예약중' : '판매완료'}
              </Text>
            </View>
          )}

          <Text style={s.brand}>{product.brand}</Text>
          <Text style={s.name}>{product.name}</Text>
          <Text style={s.price}>{product.price.toLocaleString()}원</Text>

          {/* 상세 정보 */}
          <View style={s.info}>
            {product.condition && <View style={s.infoRow}><Text style={s.infoLabel}>상태</Text><Text style={s.infoValue}>{condMap[product.condition] || product.condition}</Text></View>}
            {product.usageCount && <View style={s.infoRow}><Text style={s.infoLabel}>연식</Text><Text style={s.infoValue}>{product.usageCount}</Text></View>}
          </View>

          {product.description && (
            <View style={s.desc}>
              <Text style={s.descText}>{product.description}</Text>
            </View>
          )}

          {/* 판매자 */}
          {product.user && (
            <TouchableOpacity style={s.seller} onPress={() => navigation.navigate('SellerProfile', { sellerId: product.user!.id })}>
              <View style={s.sellerAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.sellerName}>{product.user.name}</Text>
                <Text style={s.sellerPhone}>{product.user.phone}</Text>
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>→</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('SafeTrade')} style={{ paddingVertical: 8 }}>
            <Text style={{ textAlign: 'center', fontSize: 12, color: '#0EA5E9' }}>🛡️ 안전거래 가이드 확인하기</Text>
          </TouchableOpacity>
          <Text style={{ textAlign: 'center', fontSize: 9, color: '#d1d5db', paddingBottom: 16 }}>
            스노우판은 통신판매중개자로서 거래 당사자가 아니며, 거래에 대한 책임을 지지 않습니다.
          </Text>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={s.bottom}>
        <TouchableOpacity onPress={toggleWishlist} style={s.heartBtn}>
          <Text style={{ fontSize: 22, color: wishlisted ? '#F43F5E' : '#D1D5DB' }}>{wishlisted ? '♥' : '♡'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.chatBtn} onPress={startChat} activeOpacity={0.8}>
          <Text style={s.chatBtnText}>채팅하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF' },
  content: { padding: 16 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  brand: { fontSize: 12, color: '#0EA5E9', fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  price: { fontSize: 22, fontWeight: '900', color: '#10B981', marginTop: 8 },
  info: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  desc: { marginTop: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 14 },
  descText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  seller: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 14, gap: 12 },
  sellerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  sellerPhone: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  bottom: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#BAE6FD', gap: 12 },
  heartBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  chatBtn: { flex: 1, backgroundColor: '#38BDF8', borderRadius: 12, alignItems: 'center', justifyContent: 'center', height: 48 },
  chatBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
