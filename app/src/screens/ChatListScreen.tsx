import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/api';

interface ChatRoom {
  id: string;
  user1: { id: string; name: string };
  user2: { id: string; name: string };
  messages: { content: string; createdAt: string }[];
  unreadCount: number;
}

export default function ChatListScreen({ navigation }: any) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadRooms = async () => {
    try {
      const { getUser } = await import('../utils/api');
      const u = await getUser();
      if (!u) { navigation.navigate('Login'); return; }
      setUserId(u.id);
      const data = await api<any>('/chat/rooms');
      setRooms(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadRooms(); }, []));

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return `${new Date(d).getMonth() + 1}/${new Date(d).getDate()}`;
  };

  return (
    <View style={s.container}>
      <FlatList
        data={rooms}
        keyExtractor={i => i.id}
        refreshing={loading}
        onRefresh={loadRooms}
        renderItem={({ item }) => {
          const other = item.user1.id === userId ? item.user2 : item.user1;
          const lastMsg = item.messages[0];
          return (
            <TouchableOpacity style={s.room} onPress={() => navigation.navigate('Chat', { chatId: item.id, otherName: other.name })} activeOpacity={0.7}>
              <View style={s.avatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.roomHeader}>
                  <Text style={s.roomName}>{other.name}</Text>
                  {lastMsg && <Text style={s.roomTime}>{formatTime(lastMsg.createdAt)}</Text>}
                </View>
                <Text style={s.roomMsg} numberOfLines={1}>{lastMsg?.content || '대화를 시작해보세요'}</Text>
              </View>
              {item.unreadCount > 0 && (
                <View style={s.unread}><Text style={s.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>채팅이 없습니다.</Text>}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  room: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  roomTime: { fontSize: 10, color: '#9ca3af' },
  roomMsg: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  unread: { backgroundColor: '#F43F5E', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 60, fontSize: 13 },
});
