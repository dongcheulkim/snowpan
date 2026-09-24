// 리버스 프록시 체인에서 실제 클라이언트 IP 를 판별하는 Express `trust proxy` 함수.
//
// 운영 요청 경로: 클라이언트 → Cloudflare(Render 엣지) → Render LB → 앱.
// 예전 설정(`trust proxy 1`)은 소켓 상대(Render LB) 한 홉만 신뢰해서 req.ip 가
// X-Forwarded-For 의 마지막 항목 = Cloudflare 엣지 IP(요청마다 바뀜)로 잡혔다.
// 그 결과 IP 기준 레이트리밋·로그인 잠금이 엣지 노드 단위로 뒤섞이고(공격자 개별 차단 불가,
// 같은 엣지를 쓰는 정상 사용자끼리 한도 공유), 접속 기록 IP 도 Cloudflare IP 로 남았다.
// (2026-09-24 운영 접속 기록으로 확인: 172.71.x / 172.68.x / 141.101.x = Cloudflare 대역)
//
// 이 함수는 홉 0(소켓 상대 = 항상 Render LB, 앱은 외부에서 직접 접속 불가)을 무조건 신뢰하고,
// 그 뒤 홉은 사설 대역(Render 내부)과 Cloudflare 공개 대역일 때만 신뢰한다.
// → X-Forwarded-For 오른쪽부터 신뢰 홉을 건너뛰고 처음 만나는 비신뢰 주소 = 실제 클라이언트 IP.
// 클라이언트가 X-Forwarded-For 를 미리 넣어 보내도 프록시가 실제 IP 를 그 뒤에 붙이므로 무시된다.
// 홉 0 을 무조건 신뢰하므로 체인 구성이 바뀌어도 예전 동작(`trust proxy 1`)보다 나빠지지 않는다.
//
// Cloudflare 대역 출처: https://www.cloudflare.com/ips-v4 , https://www.cloudflare.com/ips-v6 (2026-09-24 기준).
// 대역이 추가되면 그 엣지를 거친 요청만 예전처럼 엣지 IP 로 잡힌다(안전한 쪽으로 실패).
import proxyaddr from 'proxy-addr';

export const CLOUDFLARE_RANGES: string[] = [
  // IPv4
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  // IPv6
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

// 사설/루프백/링크로컬(Render 내부 홉) + Cloudflare 엣지.
const isTrustedHop = proxyaddr.compile(['loopback', 'linklocal', 'uniquelocal', ...CLOUDFLARE_RANGES]);

export function trustProxy(addr: string, hop: number): boolean {
  if (hop === 0) return true; // 소켓 상대 = Render LB (항상 신뢰)
  return isTrustedHop(addr, hop);
}
