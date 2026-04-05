import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { api, saveAuth } from '../utils/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('', '이메일과 비밀번호를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const data = await api<{ token: string; user: any }>('/auth/login', {
        method: 'POST', body: { email, password },
      });
      await saveAuth(data.token, data.user);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err: any) {
      Alert.alert('로그인 실패', err.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>스노우판</Text>
        <Text style={s.subtitle}>스키/보드 중고거래 & 렌탈</Text>

        <View style={s.form}>
          <TextInput style={s.input} placeholder="이메일" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={s.input} placeholder="비밀번호" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={[s.btn, loading && { opacity: 0.5 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            <Text style={s.btnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          <View style={s.links}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={s.link}>회원가입</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}><Text style={s.link}>비밀번호 찾기</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: '900', color: '#38BDF8', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 40 },
  form: { gap: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b' },
  btn: { backgroundColor: '#38BDF8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 },
  link: { color: '#0EA5E9', fontSize: 13, fontWeight: '500' },
});
