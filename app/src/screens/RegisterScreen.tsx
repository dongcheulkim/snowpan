import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { api, saveAuth } from '../utils/api';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', name: '', nickname: '', phone: '' });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (!agree) { Alert.alert('', '이용약관에 동의해주세요.'); return; }
    if (!form.email || !form.password || !form.name || !form.phone) { Alert.alert('', '필수 항목을 모두 입력해주세요.'); return; }
    if (form.password.length < 6) { Alert.alert('', '비밀번호는 6자 이상이어야 합니다.'); return; }
    if (form.password !== form.passwordConfirm) { Alert.alert('', '비밀번호가 일치하지 않습니다.'); return; }

    setLoading(true);
    try {
      const data = await api<{ token: string; user: any }>('/auth/register', {
        method: 'POST', body: { email: form.email, password: form.password, name: form.name, nickname: form.nickname || undefined, phone: form.phone },
      });
      await saveAuth(data.token, data.user);
      Alert.alert('가입 완료!', '스노우판에 오신 걸 환영합니다.');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) { Alert.alert('가입 실패', err.message); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.back}>← 뒤로</Text></TouchableOpacity>
        <Text style={s.title}>회원가입</Text>

        {['이름', '닉네임 (선택)', '이메일', '전화번호', '비밀번호', '비밀번호 확인'].map((label, i) => {
          const keys = ['name', 'nickname', 'email', 'phone', 'password', 'passwordConfirm'];
          const key = keys[i];
          return (
            <View key={key} style={{ marginBottom: 12 }}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={(form as any)[key]}
                onChangeText={v => update(key, v)}
                placeholder={label}
                placeholderTextColor="#9ca3af"
                secureTextEntry={key.includes('password')}
                keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}
                autoCapitalize="none"
              />
            </View>
          );
        })}

        <TouchableOpacity style={s.agreeRow} onPress={() => setAgree(!agree)}>
          <Text style={{ fontSize: 18 }}>{agree ? '☑️' : '⬜'}</Text>
          <Text style={s.agreeText}>이용약관 및 개인정보처리방침에 동의합니다.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading}>
          <Text style={s.btnText}>{loading ? '가입 중...' : '가입하기'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  back: { color: '#9ca3af', fontSize: 14, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b' },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  agreeText: { fontSize: 13, color: '#6b7280', flex: 1 },
  btn: { backgroundColor: '#38BDF8', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
