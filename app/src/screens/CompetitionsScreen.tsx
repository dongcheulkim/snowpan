import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

export default function CompetitionsScreen({ navigation }: any) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>시합 일정</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.content}>
        <View style={s.card}>
          <Text style={s.icon}>🏔️</Text>
          <Text style={s.heading}>26-27 시즌 준비중</Text>
          <Text style={s.desc}>
            다음 시즌 시합 일정은 현재 준비 중입니다.{'\n'}
            일정이 확정되면 앱을 통해 안내드리겠습니다.
          </Text>
          <View style={s.divider} />
          <Text style={s.contactLabel}>문의</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:info@snowpan.com')}>
            <Text style={s.email}>info@snowpan.com</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#BAE6FD' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 20, color: '#1e293b' },
  title: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', padding: 32, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  divider: { width: 40, height: 2, backgroundColor: '#BAE6FD', marginVertical: 20, borderRadius: 1 },
  contactLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  email: { fontSize: 15, fontWeight: '600', color: '#38BDF8' },
});
