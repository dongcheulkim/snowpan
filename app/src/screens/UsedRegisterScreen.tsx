import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { api, getUser } from '../utils/api';

const subcategories = ['ski', 'board', 'boots', 'binding', 'helmet', 'goggles', 'wear', 'etc'];
const subLabels: Record<string, string> = { ski: '스키', board: '보드', boots: '부츠', binding: '바인딩', helmet: '헬멧', goggles: '고글', wear: '의류', etc: '기타' };
const conditions = ['상', '상중', '중', '하'];
const condLabels: Record<string, string> = { '상': '새상품', '상중': '거의 새 거', '중': '사용감 적음', '하': '사용감 많음' };

export default function UsedRegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const user = await getUser();
    if (!user) { navigation.navigate('Login'); return; }
    if (!name.trim() || !brand.trim() || !subcategory || !price || !condition) {
      Alert.alert('', '필수 항목을 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/products/used', {
        method: 'POST',
        body: { name: name.trim(), brand: brand.trim(), subcategory, price: Number(price), condition, description: description.trim() },
      });
      Alert.alert('등록 완료', '상품이 등록되었습니다.', [{ text: '확인', onPress: () => navigation.goBack() }]);
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
        <Text style={s.title}>중고장비 등록</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={s.label}>상품명 *</Text>
        <TextInput style={s.input} placeholder="예: 2023 아토믹 레드스터 165cm" placeholderTextColor="#9ca3af" value={name} onChangeText={setName} />

        <Text style={s.label}>브랜드 *</Text>
        <TextInput style={s.input} placeholder="예: Atomic" placeholderTextColor="#9ca3af" value={brand} onChangeText={setBrand} />

        <Text style={s.label}>카테고리 *</Text>
        <View style={s.optionRow}>
          {subcategories.map(c => (
            <TouchableOpacity key={c} style={[s.optionBtn, subcategory === c && s.optionActive]} onPress={() => setSubcategory(c)}>
              <Text style={[s.optionText, subcategory === c && s.optionTextActive]}>{subLabels[c]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>가격 (원) *</Text>
        <TextInput style={s.input} placeholder="0" placeholderTextColor="#9ca3af" value={price} onChangeText={setPrice} keyboardType="numeric" />

        <Text style={s.label}>상태 *</Text>
        <View style={s.optionRow}>
          {conditions.map(c => (
            <TouchableOpacity key={c} style={[s.optionBtn, condition === c && s.optionActive]} onPress={() => setCondition(c)}>
              <Text style={[s.optionText, condition === c && s.optionTextActive]}>{condLabels[c]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>상세 설명</Text>
        <TextInput style={[s.input, { height: 120, textAlignVertical: 'top' }]} placeholder="상품에 대한 자세한 설명을 입력하세요" placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} multiline />

        <Text style={s.label}>사진</Text>
        <TouchableOpacity style={s.imagePlaceholder}>
          <Text style={{ fontSize: 28 }}>📷</Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>사진 추가 (준비 중)</Text>
        </TouchableOpacity>

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
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  optionActive: { backgroundColor: '#38BDF8', borderColor: '#38BDF8' },
  optionText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  optionTextActive: { color: '#fff' },
  imagePlaceholder: { width: 100, height: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { marginTop: 24, backgroundColor: '#38BDF8', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
