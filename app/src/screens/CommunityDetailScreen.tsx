import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { api, getUser } from '../utils/api';

interface Post {
  id: string; title: string; content: string; category: string; sport: string;
  likes: number; views: number; user: { id: string; name: string };
  comments: { id: string; content: string; user: { id: string; name: string }; createdAt: string }[];
  createdAt: string; liked?: boolean;
}

export default function CommunityDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [post, setPost] = useState<Post | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Post>(`/community/${id}`)
      .then(d => { setPost(d); setLikeCount(d.likes); if (d.liked) setLiked(true); })
      .catch(() => navigation.goBack());
  }, [id]);

  const toggleLike = async () => {
    try {
      const res = await api<{ likes: number; liked: boolean }>(`/community/${id}/like`, { method: 'PUT' });
      setLiked(res.liked); setLikeCount(res.likes);
    } catch (e: any) { Alert.alert('', e.message); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const c = await api<any>(`/community/${id}/comments`, { method: 'POST', body: { content: comment } });
      setPost(prev => prev ? { ...prev, comments: [...prev.comments, c] } : prev);
      setComment('');
    } catch (e: any) { Alert.alert('', e.message); }
    finally { setSubmitting(false); }
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${new Date(d).getMonth() + 1}/${new Date(d).getDate()}`;
  };

  if (!post) return <View style={s.loading}><Text style={{ color: '#9ca3af' }}>로딩 중...</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{post.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={s.card}>
          <Text style={s.title}>{post.title}</Text>
          <View style={s.meta}>
            <Text style={s.author}>{post.user.name}</Text>
            <Text style={s.time}>{formatTime(post.createdAt)}</Text>
            <Text style={s.time}>조회 {post.views}</Text>
          </View>
          <Text style={s.content}>{post.content}</Text>
          <View style={s.actions}>
            <TouchableOpacity onPress={toggleLike} style={s.likeBtn}>
              <Text style={{ color: liked ? '#F43F5E' : '#9ca3af', fontSize: 14 }}>{liked ? '♥' : '♡'} {likeCount}</Text>
            </TouchableOpacity>
            <Text style={{ color: '#9ca3af', fontSize: 13 }}>💬 {post.comments.length}</Text>
          </View>
        </View>

        {post.comments.map(c => (
          <View key={c.id} style={s.comment}>
            <Text style={s.commentAuthor}>{c.user.name}</Text>
            <Text style={s.commentText}>{c.content}</Text>
            <Text style={s.commentTime}>{formatTime(c.createdAt)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.commentBar}>
        <TextInput style={s.commentInput} value={comment} onChangeText={setComment} placeholder="댓글 입력..." placeholderTextColor="#9ca3af" />
        <TouchableOpacity style={[s.commentBtn, (!comment.trim() || submitting) && { opacity: 0.3 }]} onPress={addComment} disabled={!comment.trim() || submitting}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>등록</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#BAE6FD', gap: 12 },
  back: { fontSize: 20, color: '#9ca3af' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1e293b' },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  meta: { flexDirection: 'row', gap: 8, marginTop: 8 },
  author: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  time: { fontSize: 12, color: '#9ca3af' },
  content: { fontSize: 14, color: '#374151', lineHeight: 22, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  likeBtn: {},
  comment: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#f1f5f9' },
  commentAuthor: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  commentText: { fontSize: 13, color: '#374151', marginTop: 4 },
  commentTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  commentBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#BAE6FD', gap: 8 },
  commentInput: { flex: 1, backgroundColor: '#F0F9FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: '#1e293b', borderWidth: 1, borderColor: '#BAE6FD' },
  commentBtn: { backgroundColor: '#38BDF8', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
});
