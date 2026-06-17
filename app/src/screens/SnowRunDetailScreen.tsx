// 런 상세 — 지도(WebView + Leaflet) + 통계.
// WebView 안에 Leaflet 띄우면 react-native-maps 의 Google 키 설정 없이 OSM 사용 가능.

import { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

interface RunDetail {
  id: string;
  startedAt: string;
  durationSec: number;
  distanceM: number;
  verticalDropM: number;
  maxSpeedKmh: number | null;
  avgSpeedKmh: number | null;
  resortId: string | null;
  validated: boolean;
  pointsAwarded: number;
  trackJson: { lat: number; lng: number }[] | null;
}

const fmtSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// 지도용 HTML — Leaflet CDN + 트랙 polyline.
function buildMapHtml(track: { lat: number; lng: number }[]): string {
  const coords = JSON.stringify(track.map((p) => [p.lat, p.lng]));
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#F8FAFC;}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const coords = ${coords};
  const map = L.map('map', { zoomControl: true, attributionControl: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  const bounds = L.latLngBounds(coords);
  map.fitBounds(bounds, { padding: [20, 20] });
  L.polyline(coords, { color: '#0F172A', weight: 5, opacity: 0.85 }).addTo(map);
  L.circleMarker(coords[0], { radius: 7, color: '#fff', weight: 3, fillColor: '#059669', fillOpacity: 1 }).addTo(map);
  L.circleMarker(coords[coords.length-1], { radius: 7, color: '#fff', weight: 3, fillColor: '#DC2626', fillOpacity: 1 }).addTo(map);
</script>
</body></html>`;
}

export default function SnowRunDetailScreen() {
  const route = useRoute<{ key: string; name: string; params: { id: string } }>();
  const navigation = useNavigation<{ navigate: (name: string, params?: object) => void; goBack: () => void }>();
  const id = route.params?.id;

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<RunDetail>(`/snow-runs/${id}`)
      .then(setRun)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const html = useMemo(() => {
    if (!run?.trackJson || run.trackJson.length < 2) return null;
    return buildMapHtml(run.trackJson);
  }, [run]);

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator color="#0F172A" />
      </View>
    );
  }
  if (error || !run) {
    return (
      <View style={st.center}>
        <Text style={st.errorText}>{error || '런을 찾을 수 없습니다.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Text style={st.backBtnText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={st.container}>
      {/* 지도 */}
      {html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={st.map}
          scrollEnabled={false}
          androidLayerType="hardware"
        />
      ) : (
        <View style={[st.map, st.center]}>
          <Text style={st.emptyText}>경로 데이터가 없습니다 (구버전 런)</Text>
        </View>
      )}

      {/* 통계 */}
      <View style={st.content}>
        <View style={st.statsCard}>
          <View style={st.statsHeader}>
            <Text style={st.statsDate}>
              {new Date(run.startedAt).toLocaleString('ko-KR', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            <Text style={[st.badge, run.validated ? st.badgeOk : st.badgeNo]}>
              {run.validated ? '검증 완료' : '미검증'}
            </Text>
          </View>

          <View style={st.statsGrid}>
            <View style={st.statsCol}>
              <Text style={st.statsLabel}>거리</Text>
              <Text style={st.statsBig}>{(run.distanceM / 1000).toFixed(2)}<Text style={st.statsUnit}> km</Text></Text>
            </View>
            <View style={st.statsCol}>
              <Text style={st.statsLabel}>낙차</Text>
              <Text style={st.statsBig}>{run.verticalDropM}<Text style={st.statsUnit}> m</Text></Text>
            </View>
            <View style={st.statsCol}>
              <Text style={st.statsLabel}>시간</Text>
              <Text style={st.statsBig}>{fmtSec(run.durationSec)}</Text>
            </View>
            <View style={st.statsCol}>
              <Text style={st.statsLabel}>최고 속도</Text>
              <Text style={st.statsBig}>
                {run.maxSpeedKmh ? run.maxSpeedKmh.toFixed(0) : '—'}<Text style={st.statsUnit}> km/h</Text>
              </Text>
            </View>
            <View style={st.statsCol}>
              <Text style={st.statsLabel}>평균 속도</Text>
              <Text style={st.statsBig}>
                {run.avgSpeedKmh ? run.avgSpeedKmh.toFixed(0) : '—'}<Text style={st.statsUnit}> km/h</Text>
              </Text>
            </View>
            <View style={st.statsCol}>
              <Text style={st.statsLabel}>적립</Text>
              <Text style={[st.statsBig, run.pointsAwarded > 0 ? st.pointsOk : st.pointsDim]}>
                {run.pointsAwarded > 0 ? `+${run.pointsAwarded}` : '—'}<Text style={st.statsUnit}> P</Text>
              </Text>
            </View>
          </View>

          {run.resortId && (
            <Text style={st.resortText}>감지된 스키장: {run.resortId}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  map: { width: '100%', height: 320, backgroundColor: '#E5E7EB' },
  emptyText: { color: '#6B7280', fontSize: 13 },
  content: { padding: 16 },
  statsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statsDate: { fontSize: 11, color: '#6B7280' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  badgeOk: { backgroundColor: '#D1FAE5', color: '#059669' },
  badgeNo: { backgroundColor: '#E5E7EB', color: '#6B7280' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statsCol: { width: '45%' },
  statsLabel: { fontSize: 10, color: '#6B7280' },
  statsBig: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  statsUnit: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  pointsOk: { color: '#059669' },
  pointsDim: { color: '#9CA3AF' },
  resortText: { fontSize: 11, color: '#6B7280', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
});
