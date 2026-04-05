import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../utils/api';

interface Seller {
  id: string; name: string; nickname?: string; createdAt?: string;
  productCount?: number; avgRating?: number;
}

interface Review {
  id: string; rating: number; comment: string; createdAt: string;
  user: { name: string };
}

export default function SellerProfileScreen({ route, navigation }: any) {
  const { sellerId } = route.params;
  const [seller, setSeller] = useState<Seller | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ seller: Seller; reviews: Review[] }>(`/auth/seller/${sellerId}`)
      .then(d => {
        setSeller(d.seller || null);
        setReviews(d.reviews || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sellerId]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  const renderStars = (rating: number) => {
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < rating ? '★' : '☆';
    return stars;
  };

  if (loading) return <View style={s.loading}><Text style={{ color: '#9ca3af' }}>로딩 중...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>판매자 프로필</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          seller ? (
            <View style={s.profileCard}>
              <View style={s.avatar}><Text style={{ fontSize: 32 }}>👤</Text></View>
              <Text style={s.sellerName}>{seller.nickname || seller.name}</Text>
              {seller.createdAt && <Text style={s.since}>가입일: {formatDate(seller.createdAt)}</Text>}
              <View style={s.stats}>
                {seller.productCount != null && (
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{seller.productCount}</Text>
                    <Text style={s.statLabel}>판매상품</Text>
                  </View>
                )}
                {seller.avgRating != null && (
                  <View style={s.statItem}>
                    <Text style={s.statValue}>{seller.avgRating.toFixed(1)}</Text>
                    <Text style={s.statLabel}>평점</Text>
                  </View>
                )}
                <View style={s.statItem}>
                  <Text style={s.statValue}>{reviews.length}</Text>
                  <Text style={s.statLabel}>리뷰</Text>
                </View>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.reviewCard}>
            <View style={s.reviewTop}>
              <Text style={s.reviewerName}>{item.user.name}</Text>
              <Text style={s.reviewDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={s.stars}>{renderStars(item.rating)}</Text>
            {item.comment && <Text style={s.reviewComment}>{item.comment}</Text>}
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>아직 리뷰가 없습니다.</Text>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#BAE6FD' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1e293b' },
  title: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', padding: 24, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  sellerName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  since: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 16, gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#38BDF8' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 14, marginBottom: 8 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  reviewDate: { fontSize: 11, color: '#9ca3af' },
  stars: { fontSize: 14, color: '#F59E0B', marginBottom: 4 },
  reviewComment: { fontSize: 13, color: '#374151', lineHeight: 20 },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
