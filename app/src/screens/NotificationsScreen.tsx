import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../utils/api';

interface Notification { id: string; type: string; title: string; message: string; read: boolean; link?: string; createdAt: string; }
const icons: Record<string, string> = { chat: '💬', approve: '✅', reject: '❌', system: '📢', badge: '🏅' };

export default function NotificationsScreen({ navigation }: any) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>('/notifications')
      .then(d => setNotifs(Array.isArray(d) ? d : (d?.notifications || [])))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    try { await api(`/notifications/${id}/read`, { method: 'PUT' }); setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n)); } catch {}
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return '방금';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${new Date(d).getMonth() + 1}/${new Date(d).getDate()}`;
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.title}>알림</Text>
      </View>
      <FlatList
        data={notifs}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={() => { setLoading(true); api<any>('/notifications').then(d => setNotifs(Array.isArray(d) ? d : (d?.notifications || []))).catch(() => {}).finally(() => setLoading(false)); }}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.item, !item.read && { backgroundColor: '#F0F9FF' }]} onPress={() => { markRead(item.id); }} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>{icons[item.type] || '📢'}</Text>
            <View style={{ flex: 1 }}>
              <View style={s.itemHeader}>
                <Text style={s.itemTitle}>{item.title}</Text>
                {!item.read && <View style={s.unreadDot} />}
              </View>
              <Text style={s.itemMsg} numberOfLines={1}>{item.message}</Text>
              <Text style={s.itemTime}>{formatTime(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={{ fontSize: 32 }}>🔔</Text><Text style={s.emptyText}>알림이 없습니다.</Text></View>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, paddingTop: 50 },
  back: { fontSize: 20, color: '#9ca3af' },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  item: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12, alignItems: 'flex-start' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F43F5E' },
  itemMsg: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  itemTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
});
