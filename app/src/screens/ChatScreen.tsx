import { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { api, getUser, getToken, SERVER_URL } from '../utils/api';

interface Message {
  id: string; content: string; type: string; senderId: string;
  sender: { id: string; name: string }; createdAt: string;
}

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, otherName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    let socket: Socket;
    (async () => {
      const user = await getUser();
      const token = await getToken();
      if (!user || !token) { navigation.navigate('Login'); return; }
      setUserId(user.id);

      const msgs = await api<Message[]>(`/chat/rooms/${chatId}/messages`).catch(() => []);
      setMessages(Array.isArray(msgs) ? msgs : []);
      api(`/chat/rooms/${chatId}/read`, { method: 'PUT' }).catch(() => {});

      socket = io(SERVER_URL, { auth: { token } });
      socketRef.current = socket;
      socket.on('connect', () => { setConnected(true); socket.emit('join_room', chatId); });
      socket.on('new_message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
        api(`/chat/rooms/${chatId}/read`, { method: 'PUT' }).catch(() => {});
      });
      socket.on('disconnect', () => setConnected(false));
    })();

    return () => { socket?.disconnect(); socketRef.current = null; };
  }, [chatId]);

  const send = () => {
    if (!input.trim() || !socketRef.current || !connected) return;
    socketRef.current.emit('send_message', { roomId: chatId, content: input.trim() });
    setInput('');
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>←</Text></TouchableOpacity>
        <Text style={s.headerName}>{otherName || '채팅'}</Text>
        <View style={[s.dot, connected ? { backgroundColor: '#10B981' } : { backgroundColor: '#D1D5DB' }]} />
      </View>

      {/* 메시지 */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={i => i.id}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === userId;
          return (
            <View style={[s.msgRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
              <View style={{ maxWidth: '75%' }}>
                {!isMe && <Text style={s.senderName}>{item.sender.name}</Text>}
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleOther]}>
                  <Text style={[s.msgText, isMe ? { color: '#fff' } : { color: '#1e293b' }]}>{item.content}</Text>
                </View>
                <Text style={[s.time, isMe ? { textAlign: 'right' } : {}]}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <Text style={s.notice}>거래 시 안전에 유의하세요. 채팅 내용은 서비스 제공을 위해 저장됩니다.</Text>
        }
      />

      {/* 입력 */}
      <View style={s.inputBar}>
        <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="메시지 입력..." placeholderTextColor="#9ca3af" multiline />
        <TouchableOpacity style={[s.sendBtn, (!input.trim() || !connected) && { opacity: 0.3 }]} onPress={send} disabled={!input.trim() || !connected}>
          <Text style={s.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#BAE6FD', gap: 12, paddingTop: 50 },
  back: { fontSize: 20, color: '#9ca3af' },
  headerName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#1e293b' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notice: { textAlign: 'center', fontSize: 9, color: '#d1d5db', marginBottom: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  senderName: { fontSize: 10, color: '#9ca3af', marginBottom: 2 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMe: { backgroundColor: '#38BDF8', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 9, color: '#9ca3af', marginTop: 2 },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#BAE6FD', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F0F9FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1e293b', maxHeight: 100, borderWidth: 1, borderColor: '#BAE6FD' },
  sendBtn: { backgroundColor: '#38BDF8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
