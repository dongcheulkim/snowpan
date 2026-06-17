// 스트라바 스타일 공유 카드 — 사진 + 런 통계 오버레이.
// expo-image-picker 로 사진 선택, react-native-view-shot 으로 캡처, expo-sharing 으로 SNS 공유.

import { useEffect, useRef, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

interface RunDetail {
  id: string;
  startedAt: string;
  durationSec: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number | null;
  pointsAwarded: number;
  resortId: string | null;
}

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const CARD_H = (CARD_W * 5) / 4; // 4:5 비율 (인스타 권장)

const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function SnowRunShareScreen() {
  const route = useRoute<{ key: string; name: string; params: { id: string } }>();
  const nav = useNavigation<{ goBack: () => void }>();
  const id = route.params?.id;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    if (!id) return;
    api<RunDetail>(`/snow-runs/${id}`).then(setRun).catch(() => {});
  }, [id]);

  const onPickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      aspect: [4, 5],
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const onCapturePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      aspect: [4, 5],
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const onShare = async () => {
    if (!cardRef.current || !run) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 0.95,
        result: 'tmpfile',
      });
      const can = await Sharing.isAvailableAsync();
      if (can) {
        await Sharing.shareAsync(uri, { dialogTitle: '오늘의 스노우런', mimeType: 'image/png' });
      } else {
        Alert.alert('공유 불가', '이 기기에서는 공유가 지원되지 않습니다.');
      }
    } catch (e) {
      Alert.alert('공유 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!run) {
    return (
      <View style={st.center}>
        <ActivityIndicator color="#0F172A" />
      </View>
    );
  }

  const date = new Date(run.startedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const distKm = (run.distanceM / 1000).toFixed(2);

  return (
    <View style={st.container}>
      <View style={st.cardWrap}>
        {/* 캡처 대상 — ref */}
        <View ref={cardRef} collapsable={false} style={[st.card, { width: CARD_W, height: CARD_H }]}>
          {photoUri ? (
            <ImageBackground source={{ uri: photoUri }} style={st.bg} resizeMode="cover">
              <View style={st.topShade} />
              <Text style={st.brand}>SNOWPAN</Text>
              <View style={st.bottomShade} />
              {/* 통계 영역 */}
              <View style={st.stats}>
                <Text style={st.statsDate}>
                  {date}{run.resortId ? ` · ${run.resortId}` : ''}
                </Text>
                <View style={st.bigRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.statsLabel}>거리</Text>
                    <Text style={st.statsBig}>
                      {distKm}
                      <Text style={st.statsUnit}> km</Text>
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={st.statsLabel}>낙차</Text>
                    <Text style={st.statsBig}>
                      {run.verticalDropM}
                      <Text style={st.statsUnit}> m</Text>
                    </Text>
                  </View>
                </View>
                <View style={st.smallRow}>
                  <View style={st.smallCol}>
                    <Text style={st.statsLabel}>시간</Text>
                    <Text style={st.statsMid}>{fmtSec(run.durationSec)}</Text>
                  </View>
                  <View style={st.smallCol}>
                    <Text style={st.statsLabel}>최고 속도</Text>
                    <Text style={st.statsMid}>{run.maxSpeedKmh ? `${run.maxSpeedKmh.toFixed(0)} km/h` : '—'}</Text>
                  </View>
                  <View style={st.smallCol}>
                    <Text style={st.statsLabel}>적립</Text>
                    <Text style={[st.statsMid, run.pointsAwarded > 0 ? st.statsPos : st.statsDim]}>
                      {run.pointsAwarded > 0 ? `+${run.pointsAwarded}P` : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
          ) : (
            <View style={[st.bg, st.center, { backgroundColor: '#0F172A' }]}>
              <Text style={{ fontSize: 48, marginBottom: 10 }}>📷</Text>
              <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingHorizontal: 30 }}>
                사진을 선택하면 오늘 기록이 자동으로 합성됩니다
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 사진 선택 */}
      <View style={st.actions}>
        <View style={st.pickRow}>
          <TouchableOpacity style={st.pickBtn} onPress={onPickPhoto} disabled={busy}>
            <Text style={st.pickBtnText}>📷 갤러리</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.pickBtn} onPress={onCapturePhoto} disabled={busy}>
            <Text style={st.pickBtnText}>📸 카메라</Text>
          </TouchableOpacity>
        </View>

        {photoUri && (
          <TouchableOpacity style={st.shareBtn} onPress={onShare} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.shareBtnText}>🔗 공유</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => nav.goBack()} style={st.backBtn}>
          <Text style={st.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { alignItems: 'center', justifyContent: 'center' },
  cardWrap: { padding: 16, alignItems: 'center' },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#0F172A' },
  bg: { flex: 1, justifyContent: 'space-between' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.35)' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundColor: 'rgba(15,23,42,0.75)' },
  brand: { color: '#fff', fontSize: 22, fontWeight: '900', position: 'absolute', top: 16, left: 16, letterSpacing: 1 },
  stats: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  statsDate: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  bigRow: { flexDirection: 'row', marginBottom: 18 },
  statsLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },
  statsBig: { color: '#fff', fontSize: 44, fontWeight: '900', marginTop: 2 },
  statsUnit: { color: '#D1D5DB', fontSize: 16, fontWeight: '700' },
  smallRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 12 },
  smallCol: { flex: 1 },
  statsMid: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  statsPos: { color: '#34D399' },
  statsDim: { color: '#9CA3AF' },
  actions: { padding: 16, gap: 8 },
  pickRow: { flexDirection: 'row', gap: 8 },
  pickBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  pickBtnText: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  shareBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  backBtn: { paddingVertical: 10, alignItems: 'center' },
  backBtnText: { color: '#6B7280', fontSize: 13 },
});
