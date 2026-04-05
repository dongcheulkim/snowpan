import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { api, getUser } from '../utils/api';

export default function ChangePasswordScreen({ navigation }: any) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const user = await getUser();
    if (!user) { navigation.navigate('Login'); return; }
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('', '모든 항목을 입력해주세요.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('', '새 비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('', '새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/auth/change-password', {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      Alert.alert('완료', '비밀번호가 변경되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('변경 실패', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>비밀번호 변경</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={s.label}>현재 비밀번호</Text>
        <TextInput style={s.input} placeholder="현재 비밀번호" placeholderTextColor="#9ca3af" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />

        <Text style={s.label}>새 비밀번호</Text>
        <TextInput style={s.input} placeholder="6자 이상" placeholderTextColor="#9ca3af" value={newPassword} onChangeText={setNewPassword} secureTextEntry />

        <Text style={s.label}>새 비밀번호 확인</Text>
        <TextInput style={s.input} placeholder="새 비밀번호 재입력" placeholderTextColor="#9ca3af" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          <Text style={s.submitText}>{submitting ? '변경 중...' : '비밀번호 변경'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#BAE6FD' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1e293b' },
  title: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  submitBtn: { marginTop: 32, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
