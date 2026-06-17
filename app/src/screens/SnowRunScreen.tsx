// 스노우런 세션 화면 — 캐시워크 모델.
// 도착 시 "세션 시작" 1번 → 자동으로 슬로프마다 +1 런 → 떠날 때 "세션 종료" 1번.

import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api } from '../utils/api';
import {
  startSession,
  endSession,
  getSessionState,
  resetSession,
  isSessionActive,
  SessionState,
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
const fmtHM = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function SnowRunScreen() {
  const [active, setActive] = useState(false);
  const [, setTick] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [busy, setBusy] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 초기 로드 + 진행 중인 세션 복원.
  useEffect(() => {
    (async () => {
      if (await isSessionActive()) setActive(true);
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

  // 활성 중 화면 1초마다 리렌더.
  useEffect(() => {
    if (!active) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      return;
    }
    tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [active]);

  const session: SessionState = getSessionState();
  const sessionElapsedSec = active && session.sessionStartedAt > 0
    ? Math.floor((Date.now() - session.sessionStartedAt) / 1000)
    : 0;

  const onStart = async () => {
    setBusy(true);
    resetSession();
    try {
      const r = await startSession();
      if (!r.ok) { Alert.alert('시작 실패', r.reason); return; }
      if (!r.hasBackground) {
        Alert.alert(
          '백그라운드 권한 없음',
          '화면 꺼지면 트래킹이 멈춥니다. 설정에서 "항상 허용"을 켜야 자동 감지가 안정적입니다.'
        );
      }
      setActive(true);
    } finally {
      setBusy(false);
    }
  };

  const onEnd = async () => {
    if (session.phase === 'DESCENDING') {
      const ok = await new Promise<boolean>((resolve) =>
        Alert.alert('세션 종료', '현재 슬로프 내리는 중입니다. 그래도 종료할까요?', [
          { text: '취소', onPress: () => resolve(false) },
          { text: '종료', style: 'destructive', onPress: () => resolve(true) },
        ])
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      const final = await endSession();
      setActive(false);
      Alert.alert(
        '세션 종료',
        `총 ${final.runCount}런 · ${(final.totalDistanceM / 1000).toFixed(2)}km · 낙차 ${Math.round(final.totalVerticalDropM)}m\n` +
          `적립 ${final.pointsAwardedThisSession.toLocaleString()}P`
      );
      resetSession();
      // 새 통계 로드.
      try {
        const [s, r] = await Promise.all([
          api<Stats>('/snow-runs/stats'),
          api<{ items: RunItem[] }>('/snow-runs/my?limit=5'),
        ]);
        setStats(s);
        setRuns(r.items);
      } catch {}
    } finally {
      setBusy(false);
    }
  };

  // 현재 진행 중 하강 정보.
  const cd = session.currentDescent;

  return (
    <ScrollView style={st.container} contentContainerStyle={st.content}>
      {/* 세션 카드 — 활성 시 큰 카드, 비활성 시 시즌 요약 */}
      {active ? (
        <View style={st.heroCard}>
          <View style={st.recRow}>
            <View style={st.recDot} />
            <Text style={st.recLabel}>세션 진행 중 · {fmtHM(sessionElapsedSec)}</Text>
          </View>
          <Text style={st.heroBig}>
            {session.runCount}
            <Text style={st.heroBigUnit}> 런</Text>
          </Text>
          <View style={st.heroRow}>
            <View style={st.heroSmallCol}>
              <Text style={st.heroSmallLabel}>세션 거리</Text>
              <Text style={st.heroSmallValue}>{(session.totalDistanceM / 1000).toFixed(2)} km</Text>
            </View>
            <View style={st.heroSmallCol}>
              <Text style={st.heroSmallLabel}>세션 낙차</Text>
              <Text style={st.heroSmallValue}>{Math.round(session.totalVerticalDropM)} m</Text>
            </View>
            <View style={st.heroSmallCol}>
              <Text style={st.heroSmallLabel}>적립</Text>
              <Text style={st.heroSmallValue}>{session.pointsAwardedThisSession.toLocaleString()}P</Text>
            </View>
          </View>

          {/* 현재 상태 */}
          <View style={st.phaseBox}>
            {session.phase === 'DESCENDING' && cd ? (
              <>
                <Text style={st.phaseTitle}>🎿 내려가는 중</Text>
                <Text style={st.phaseStat}>
                  낙차 {Math.round(cd.verticalDropM)}m · {(cd.distanceM / 1000).toFixed(2)}km · {session.currentSpeedKmh.toFixed(0)}km/h
                </Text>
              </>
            ) : (
              <>
                <Text style={st.phaseTitle}>⛷️ 대기 중 (리프트/평지)</Text>
                <Text style={st.phaseStat}>슬로프 내리면 자동 감지 시작</Text>
              </>
            )}
          </View>

          {!session.hasAltitude && (
            <Text style={st.warn}>⚠ 고도 정보가 없어 자동 감지가 안 됩니다 (낮은 사양 기기)</Text>
          )}
          {session.lastSubmissionMessage && (
            <Text style={st.lastMsg}>↳ {session.lastSubmissionMessage}</Text>
          )}
        </View>
      ) : (
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
      )}

      {/* 시작/종료 */}
      {!active ? (
        <TouchableOpacity style={st.startBtn} onPress={onStart} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.startBtnText}>▶ 오늘 세션 시작</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={st.stopBtn} onPress={onEnd} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.stopBtnText}>■ 세션 종료</Text>}
        </TouchableOpacity>
      )}
      <Text style={st.helperText}>
        {active
          ? `자동 감지 중 · 오늘 적립 가능 ${stats?.today.remainingRewardable ?? 10}회 남음 · 1런 100P`
          : `시작 1번만 누르면 슬로프 탈 때마다 자동 카운트 · 1런 100P · 1일 10회 캡`}
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
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
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
  heroBig: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 4 },
  heroBigUnit: { fontSize: 16, fontWeight: '700', color: '#D1D5DB' },
  heroRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  heroSmallCol: { flex: 1, backgroundColor: '#1F2937', borderRadius: 8, padding: 10 },
  heroSmallLabel: { color: '#9CA3AF', fontSize: 10 },
  heroSmallValue: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  recLabel: { color: '#DC2626', fontSize: 11, fontWeight: '700' },
  phaseBox: { backgroundColor: '#1F2937', borderRadius: 12, padding: 12, marginTop: 14 },
  phaseTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  phaseStat: { color: '#D1D5DB', fontSize: 12, marginTop: 4 },
  warn: { color: '#FCD34D', fontSize: 10, textAlign: 'center', marginTop: 8 },
  lastMsg: { color: '#86EFAC', fontSize: 11, marginTop: 8, textAlign: 'center' },
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
