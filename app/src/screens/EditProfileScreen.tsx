import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { api, getUser, saveAuth, getToken } from '../utils/api';

export default function EditProfileScreen({ navigation }: any) {
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getUser().then(u => {
      if (!u) { navigation.navigate('Login'); return; }
      setNickname(u.nickname || u.name || '');
      setOriginalNickname(u.nickname || u.name || '');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('', '닉네임을 입력해주세요.');
      return;
    }
    if (nickname.trim() === originalNickname) {
      Alert.alert('', '변경사항이 없습니다.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ user: any }>('/auth/profile', {
        method: 'PUT',
        body: { nickname: nickname.trim() },
      });
      const token = await getToken();
      if (token && res.user) await saveAuth(token, res.user);
      Alert.alert('완료', '프로필이 수정되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('수정 실패', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={s.loading}><Text style={{ color: '#9ca3af' }}>로딩 중...</Text></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>프로필 수정</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={s.avatarSection}>
          <View style={s.avatar}><Text style={{ fontSize: 36 }}>👤</Text></View>
        </View>

        <Text style={s.label}>닉네임</Text>
        <TextInput style={s.input} placeholder="닉네임을 입력하세요" placeholderTextColor="#9ca3af" value={nickname} onChangeText={setNickname} />

        <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
          <Text style={s.menuLabel}>비밀번호 변경</Text>
          <Text style={s.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.saveBtn, submitting && { opacity: 0.5 }]} onPress={handleSave} disabled={submitting} activeOpacity={0.8}>
          <Text style={s.saveText}>{submitting ? '저장 중...' : '저장하기'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', paddingHorizontal: 16, paddingVertical: 16, marginTop: 16 },
  menuLabel: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  menuArrow: { fontSize: 12, color: '#9ca3af' },
  saveBtn: { marginTop: 24, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
