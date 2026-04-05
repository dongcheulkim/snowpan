import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../utils/api';

interface Post {
  id: string; title: string; category: string; likes: number; views: number; commentCount: number;
  user: { name: string }; createdAt: string;
}

const badgeMap: Record<string, string> = { free: '자유', review: '장비리뷰', gear: '장비추천', resort: '스키장', tip: '초보팁', carpool: '카풀', poll: '투표' };

export default function CommunityScreen({ navigation }: any) {
  const [tab, setTab] = useState<'ski' | 'board'>('ski');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<Post[]>(`/community/popular?sport=${tab}`)
      .then(d => setPosts(Array.isArray(d) ? d : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={s.container}>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'ski' && s.tabActive]} onPress={() => setTab('ski')}>
          <Text style={[s.tabText, tab === 'ski' && s.tabTextActive]}>⛷️ 스키</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'board' && s.tabActive]} onPress={() => setTab('board')}>
          <Text style={[s.tabText, tab === 'board' && s.tabTextActive]}>🏂 보드</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={() => { setLoading(true); api<Post[]>(`/community/popular?sport=${tab}`).then(d => setPosts(Array.isArray(d) ? d : [])).catch(() => setPosts([])).finally(() => setLoading(false)); }}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={s.post} onPress={() => navigation.navigate('CommunityDetail', { id: item.id })} activeOpacity={0.7}>
            <View style={[s.rank, index < 3 && { backgroundColor: '#38BDF8' }]}>
              <Text style={[s.rankText, index < 3 && { color: '#fff' }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.postMeta}>
                <Text style={s.badge}>{badgeMap[item.category] || item.category}</Text>
                <Text style={s.time}>{formatTime(item.createdAt)}</Text>
              </View>
              <Text style={s.postTitle} numberOfLines={1}>{item.title}</Text>
              <View style={s.postStats}>
                <Text style={s.statHeart}>♥ {item.likes}</Text>
                <Text style={s.stat}>💬 {item.commentCount}</Text>
                <Text style={s.stat}>조회 {item.views}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>게시글이 없습니다.</Text>}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  tabs: { flexDirection: 'row', padding: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  tabActive: { backgroundColor: '#38BDF8' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  post: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 8, gap: 12 },
  rank: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '900', color: '#9ca3af' },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { fontSize: 10, color: '#6b7280', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  time: { fontSize: 10, color: '#9ca3af' },
  postTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  postStats: { flexDirection: 'row', gap: 12, marginTop: 6 },
  statHeart: { fontSize: 11, color: '#F43F5E' },
  stat: { fontSize: 11, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 40, fontSize: 13 },
});
