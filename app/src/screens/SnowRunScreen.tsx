// 스노우런 트래킹 화면 — 백그라운드 GPS 시작/정지 + 통계 + 최근 런.
// 화면 꺼져도 트래킹 유지 (foreground service / iOS background mode).

import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../utils/api';
import {
  startTracking,
  stopTracking,
  getCurrentTrack,
  resetTrack,
  isCurrentlyTracking,
} from '../utils/snowRunTracker';

interface Stats {
  allTime: { runCount: number; totalDistanceKm: string; totalVerticalDropM: number; totalPoints: number; maxSpeedKmh: number | null };
  season: { year: string; runCount: number; totalDistanceKm: string; totalVerticalDropM: number; totalPoints: number };
  today: { runCount: number; remainingRewardable: number };
}

interface RunItem {
  id: string;
  startedAt: string;
  durationSec: number;
  distanceM: number;
  verticalDropM: number;
  validated: boolean;
  pointsAwarded: number;
}

const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export default function SnowRunScreen() {
  const [recording, setRecording] = useState(false);
  const [, setTick] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 진입 시 — 이미 트래킹 중인지 확인 + 통계/이력 로드.
  useEffect(() => {
    (async () => {
      const ongoing = await isCurrentlyTracking();
      if (ongoing) setRecording(true);
      try {
        const [s, r] = await Promise.all([
          api<Stats>('/snow-runs/stats'),
          api<{ items: RunItem[] }>('/snow-runs/my?limit=5'),
        ]);
        setStats(s);
        setRuns(r.items);
      } catch {}
    })();
  }, []);

  // 녹화 중 화면 1초마다 갱신.
  useEffect(() => {
    if (!recording) {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
      return;
    }
    tickIntervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [recording]);

  const current = getCurrentTrack();
  const elapsedSec = recording && current.startedAt > 0 ? Math.floor((Date.now() - current.startedAt) / 1000) : 0;

  const onStart = async () => {
    resetTrack();
    const r = await startTracking();
    if (!r.ok) {
      Alert.alert('시작 실패', r.reason);
      return;
    }
    if (!r.hasBackground) {
      Alert.alert(
        '백그라운드 권한 없음',
        '화면이 꺼지면 트래킹이 멈춥니다. 정확한 기록을 원하시면 설정에서 "항상 허용"을 켜주세요.'
      );
    }
    setRecording(true);
  };

  const onStop = async () => {
    const final = await stopTracking();
    setRecording(false);

    const endedAt = Date.now();
    const durationSec = Math.floor((endedAt - final.startedAt) / 1000);

    if (durationSec < 30 || final.distanceM < 100) {
      Alert.alert('짧은 런', '30초 + 100m 이상이어야 기록됩니다.');
      resetTrack();
      return;
    }

    const avgSpeedKmh = (final.distanceM / durationSec) * 3.6;
    setSubmitting(true);
    try {
      const result = await api<{
        pointsAwarded: number;
        balance: number | null;
        validated: boolean;
        message: string;
        rejectionReasons?: string[];
      }>('/snow-runs', {
        method: 'POST',
        body: {
          startedAt: new Date(final.startedAt).toISOString(),
          endedAt: new Date(endedAt).toISOString(),
          distanceM: Math.round(final.distanceM),
          verticalDropM: Math.round(final.verticalDropM),
          maxSpeedKmh: final.maxSpeedKmh,
          avgSpeedKmh,
          source: 'app_gps',
          samplePoints: final.samplePoints,
        },
      });
      Alert.alert(
        result.validated ? '런 완료' : '런 기록됨',
        result.message +
          (result.validated && result.pointsAwarded > 0 ? `\n잔액: ${(result.balance || 0).toLocaleString()}P` : '') +
          (result.rejectionReasons ? `\n사유: ${result.rejectionReasons.join(', ')}` : '')
      );
      resetTrack();
      // 새 데이터 로드.
      const [s, r] = await Promise.all([
        api<Stats>('/snow-runs/stats'),
        api<{ items: RunItem[] }>('/snow-runs/my?limit=5'),
      ]);
      setStats(s);
      setRuns(r.items);
    } catch (e) {
      Alert.alert('제출 실패', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* 상단 통계 카드 */}
      <View style={st.heroCard}>
        <Text style={st.heroLabel}>{stats?.season.year || '—'} 시즌</Text>
        <Text style={st.heroBig}>
          {stats?.season.runCount ?? '—'}
          <Text style={st.heroBigUnit}> 런</Text>
        </Text>
        <View style={st.heroRow}>
          <View style={st.heroSmallCol}>
            <Text style={st.heroSmallLabel}>시즌 거리</Text>
            <Text style={st.heroSmallValue}>{stats?.season.totalDistanceKm || '0.0'} km</Text>
          </View>
          <View style={st.heroSmallCol}>
            <Text style={st.heroSmallLabel}>시즌 낙차</Text>
            <Text style={st.heroSmallValue}>{(stats?.season.totalVerticalDropM || 0).toLocaleString()} m</Text>
          </View>
          <View style={st.heroSmallCol}>
            <Text style={st.heroSmallLabel}>적립</Text>
            <Text style={st.heroSmallValue}>{(stats?.season.totalPoints || 0).toLocaleString()}P</Text>
          </View>
        </View>
      </View>

      {/* 실시간 표시 — 트래킹 중일 때만 */}
      {recording && (
        <View style={st.recordCard}>
          <View style={st.recRow}>
            <View style={st.recDot} />
            <Text style={st.recLabel}>REC</Text>
          </View>
          <Text style={st.elapsed}>{fmtSec(elapsedSec)}</Text>
          <View style={st.recStats}>
            <View style={st.recStatCol}>
              <Text style={st.recStatLabel}>거리</Text>
              <Text style={st.recStatValue}>{(current.distanceM / 1000).toFixed(2)} km</Text>
            </View>
            <View style={st.recStatCol}>
              <Text style={st.recStatLabel}>낙차</Text>
              <Text style={st.recStatValue}>{Math.round(current.verticalDropM)} m</Text>
            </View>
            <View style={st.recStatCol}>
              <Text style={st.recStatLabel}>속도</Text>
              <Text style={st.recStatValue}>{current.currentSpeedKmh.toFixed(0)} km/h</Text>
            </View>
          </View>
          {!current.hasAltitude && (
            <Text style={st.warn}>⚠ 고도 정보 없음 — 낙차 0 으로 측정될 수 있음</Text>
          )}
        </View>
      )}

      {/* 시작/정지 버튼 */}
      {!recording ? (
        <TouchableOpacity style={st.startBtn} onPress={onStart} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={st.startBtnText}>▶ 런 시작</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={st.stopBtn} onPress={onStop} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={st.stopBtnText}>■ 정지 & 저장</Text>
          )}
        </TouchableOpacity>
      )}
      <Text style={st.helperText}>
        오늘 적립 가능 {stats?.today.remainingRewardable ?? 10}회 남음 · 1런 100P
      </Text>

      {/* 최근 런 */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>최근 런</Text>
        {runs.length === 0 ? (
          <Text style={st.empty}>아직 기록이 없습니다.</Text>
        ) : (
          runs.map((r, idx) => (
            <View key={r.id} style={[st.runItem, idx !== runs.length - 1 && st.runItemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={st.runTitle}>
                  {(r.distanceM / 1000).toFixed(2)} km · 낙차 {r.verticalDropM}m · {fmtSec(r.durationSec)}
                </Text>
                <Text style={st.runMeta}>
                  {new Date(r.startedAt).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {!r.validated && '  · 미검증'}
                </Text>
              </View>
              <Text style={r.pointsAwarded > 0 ? st.runPoints : st.runPointsDim}>
                {r.pointsAwarded > 0 ? `+${r.pointsAwarded}P` : '—'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20 },
  heroLabel: { color: '#9CA3AF', fontSize: 11 },
  heroBig: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 4 },
  heroBigUnit: { fontSize: 14, fontWeight: '700', color: '#D1D5DB' },
  heroRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  heroSmallCol: { flex: 1, backgroundColor: '#1F2937', borderRadius: 8, padding: 10 },
  heroSmallLabel: { color: '#9CA3AF', fontSize: 10 },
  heroSmallValue: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 },
  recordCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 20, marginTop: 12 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  recLabel: { color: '#DC2626', fontSize: 11, fontWeight: '900' },
  elapsed: { color: '#fff', fontSize: 56, fontWeight: '900', textAlign: 'center', marginVertical: 8 },
  recStats: { flexDirection: 'row', gap: 8 },
  recStatCol: { flex: 1, alignItems: 'center' },
  recStatLabel: { color: '#9CA3AF', fontSize: 10 },
  recStatValue: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  warn: { color: '#FCD34D', fontSize: 10, textAlign: 'center', marginTop: 8 },
  startBtn: { backgroundColor: '#0F172A', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  stopBtn: { backgroundColor: '#DC2626', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16 },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  helperText: { textAlign: 'center', color: '#6B7280', fontSize: 11, marginTop: 8 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#6B7280', fontSize: 13, paddingVertical: 16 },
  runItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  runItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  runTitle: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  runMeta: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  runPoints: { fontSize: 13, fontWeight: '700', color: '#059669', marginLeft: 8 },
  runPointsDim: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginLeft: 8 },
});
