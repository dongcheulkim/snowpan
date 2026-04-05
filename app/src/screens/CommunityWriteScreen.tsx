import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { api, getUser } from '../utils/api';

const categories = ['free', 'review', 'gear', 'resort', 'tip', 'carpool', 'poll'];
const catLabels: Record<string, string> = { free: '자유', review: '장비리뷰', gear: '장비추천', resort: '스키장', tip: '초보팁', carpool: '카풀', poll: '투표' };

export default function CommunityWriteScreen({ route, navigation }: any) {
  const sport = route?.params?.sport || 'ski';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('free');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const user = await getUser();
    if (!user) { navigation.navigate('Login'); return; }
    if (!title.trim() || !content.trim()) {
      Alert.alert('', '제목과 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/community', {
        method: 'POST',
        body: { title: title.trim(), content: content.trim(), category, sport },
      });
      Alert.alert('등록 완료', '게시글이 등록되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('등록 실패', e.message);
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
        <Text style={s.title}>커뮤니티 글쓰기</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={s.sportLabel}>{sport === 'ski' ? '스키' : '보드'} 게시판</Text>

        <Text style={s.label}>카테고리</Text>
        <View style={s.optionRow}>
          {categories.map(c => (
            <TouchableOpacity key={c} style={[s.optionBtn, category === c && s.optionActive]} onPress={() => setCategory(c)}>
              <Text style={[s.optionText, category === c && s.optionTextActive]}>{catLabels[c]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>제목 *</Text>
        <TextInput style={s.input} placeholder="제목을 입력하세요" placeholderTextColor="#9ca3af" value={title} onChangeText={setTitle} />

        <Text style={s.label}>내용 *</Text>
        <TextInput style={[s.input, { height: 200, textAlignVertical: 'top' }]} placeholder="내용을 입력하세요" placeholderTextColor="#9ca3af" value={content} onChangeText={setContent} multiline />

        <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}>
          <Text style={s.submitText}>{submitting ? '등록 중...' : '등록하기'}</Text>
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
  sportLabel: { fontSize: 14, fontWeight: '600', color: '#38BDF8', backgroundColor: '#E0F2FE', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  optionActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  optionText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  optionTextActive: { color: '#fff' },
  submitBtn: { marginTop: 24, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
