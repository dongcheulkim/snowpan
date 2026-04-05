import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SERVER_URL } from '../utils/api';

export default function AdBookingScreen({ navigation }: any) {
  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>광고 신청</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.content}>
        <View style={s.card}>
          <Text style={s.icon}>📢</Text>
          <Text style={s.heading}>스노우판 광고</Text>
          <Text style={s.desc}>
            스노우판에 광고를 게재하여{'\n'}
            더 많은 스키어/보더에게{'\n'}
            비즈니스를 홍보하세요!
          </Text>

          <View style={s.infoSection}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>프리미엄 광고</Text>
              <Text style={s.infoValue}>중고장터 상단 노출</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>배너 광고</Text>
              <Text style={s.infoValue}>메인 화면 배너</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>제휴 광고</Text>
              <Text style={s.infoValue}>스키샵/정비샵 우선 노출</Text>
            </View>
          </View>

          <View style={s.divider} />

          <Text style={s.notice}>광고 신청은 웹에서 진행해주세요</Text>

          <TouchableOpacity style={s.linkBtn} onPress={() => Linking.openURL(`${SERVER_URL}/ad`)} activeOpacity={0.8}>
            <Text style={s.linkBtnText}>웹에서 신청하기</Text>
          </TouchableOpacity>

          <Text style={s.contact}>문의: info@snowpan.com</Text>
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
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', padding: 28, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 12 },
  heading: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  infoSection: { marginTop: 20, width: '100%' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  infoValue: { fontSize: 12, color: '#6b7280' },
  divider: { width: 40, height: 2, backgroundColor: '#BAE6FD', marginVertical: 20, borderRadius: 1 },
  notice: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  linkBtn: { backgroundColor: '#38BDF8', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  linkBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  contact: { fontSize: 12, color: '#9ca3af', marginTop: 16 },
});
