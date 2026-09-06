"""사장님 연락 보드(HTML) 생성 — 운영 API의 스키·보드샵/정비샵/렌탈샵 본 행(겸업 제외)을 리조트별로 묶어 board_template.html 에 심는다.
리뷰수·네이버링크는 ~/Desktop/스노우판_매장_체크표.xlsx(등록ID 기준)에서 붙인다(없으면 0/빈값).
사용: python3 build_board.py [출력경로]  → Artifact 도구로 발행(capabilities db). 상태·메모는 아티팩트 DB 'shops' 컬렉션(문서 id = 매장 id)에 저장된다.
"""
import json, sys, urllib.request, os
API = 'https://snowpan.onrender.com/api'
HERE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.expanduser('~/Desktop/스노우판_매장_체크표.xlsx')

def get(path):
    with urllib.request.urlopen(API + path, timeout=60) as r: return json.load(r)

meta = {}
if os.path.exists(XLSX):
    import openpyxl
    for ws in openpyxl.load_workbook(XLSX, read_only=True).worksheets:
        rows = ws.iter_rows(values_only=True); hdr = next(rows); idx = {h: i for i, h in enumerate(hdr)}
        for r in rows:
            if r and r[idx['등록ID']]:
                meta[r[idx['등록ID']]] = {'reviews': r[idx.get('리뷰수(수집시점)', -1)] or 0, 'naver': r[idx.get('네이버링크', -1)] or ''}

ski = [r for r in get('/ski-shops') if r['kind'] == 'skishop']
rep = [r for r in get('/repair-shops') if r['kind'] == 'repair']
ren, off = [], 0
while True:
    d = get(f'/rentals?limit=100&offset={off}'); ren += [r for r in d['items'] if r['kind'] == 'rental']
    off += 100
    if off >= d['totalCount']: break
resorts = get('/resorts'); rid = {r['name']: r['id'] for r in resorts}

def slim(r, kind):
    m = meta.get(r['id'], {})
    return {'id': r['id'], 'kind': kind, 'name': r['name'], 'area': r.get('area') or '', 'resortId': r.get('resortId') or '',
            'resort': (r.get('resort') or {}).get('name') or '', 'address': r.get('address') or '', 'phone': r.get('phone') or '',
            'hours': r.get('hours') or '', 'naver': m.get('naver') or r.get('naverMap') or '', 'extraKinds': r.get('extraKinds') or '',
            'reviews': int(m.get('reviews') or 0), 'owner': not bool(r.get('claimable'))}
data = [slim(r, 'skishop') for r in ski] + [slim(r, 'repair') for r in rep] + [slim(r, 'rental') for r in ren]

GROUPS = [
    ('gonjiam', '곤지암리조트', '경기 광주', ['곤지암리조트']), ('jisan', '지산리조트', '경기 이천', ['지산리조트']),
    ('vivaldi', '비발디파크', '강원 홍천', ['비발디파크']), ('phoenix', '휘닉스평창', '강원 평창', ['휘닉스평창']),
    ('yongpyong', '용평·알펜시아', '강원 평창', ['용평리조트', '알펜시아']), ('high1', '하이원', '강원 정선', ['하이원']),
    ('muju', '무주덕유산', '전북 무주', ['무주덕유산']), ('welli', '웰리힐리파크', '강원 횡성', ['웰리힐리파크']),
    ('oak', '오크밸리', '강원 원주', ['오크밸리']), ('elysian', '엘리시안강촌', '강원 춘천', ['엘리시안강촌']),
    ('o2', '오투리조트', '강원 태백', ['오투리조트']), ('eden', '에덴밸리', '경남 양산', ['에덴밸리']),
]
groups = [{'key': k, 'name': n, 'hint': h, 'ids': [rid[x] for x in names]} for k, n, h, names in GROUPS]
groups.append({'key': 'none', 'name': '리조트 외', 'hint': '서울·도심 매장', 'ids': ['']})
covered = {i for g in groups for i in g['ids']}
for r in data:
    if (r['resortId'] or '') not in covered: print('리조트 그룹 없음:', r['resort'], r['name']); r['resortId'] = ''

html = open(os.path.join(HERE, 'board_template.html'), encoding='utf-8').read()
html = html.replace('__DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':'))).replace('__GROUPS__', json.dumps(groups, ensure_ascii=False))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'snowpan_outreach_board.html')
open(out, 'w', encoding='utf-8').write(html)
print(f'{len(data)}개 매장 → {out}')
