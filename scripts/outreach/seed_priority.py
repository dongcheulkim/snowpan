"""연락 보드 우선순위(수집 시점 네이버 리뷰 수) 시딩 — 관리자 API POST /admin/outreach/bulk.
체크표 xlsx(시트 스키샵/정비샵/렌탈샵, 열 '등록ID'·'리뷰수(수집시점)')에서 등록ID → 리뷰수를 읽어 priority 로 넣는다. 리뷰 내용은 저장하지 않는다.
사용: ADMIN_EMAIL=... ADMIN_PASSWORD=... python3 seed_priority.py [xlsx경로] [--dry-run]
"""
import json, os, sys, urllib.request
API = os.environ.get('SNOWPAN_API', 'https://snowpan.onrender.com/api')
XLSX = next((a for a in sys.argv[1:] if a.endswith('.xlsx')), os.path.expanduser('~/Desktop/스노우판_매장_체크표.xlsx'))
DRY = '--dry-run' in sys.argv
SHEET_KIND = {'스키샵': 'skishop', '정비샵': 'repair', '렌탈샵': 'rental'}

def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)

import openpyxl
items = []
for ws in openpyxl.load_workbook(XLSX, read_only=True).worksheets:
    kind = SHEET_KIND.get(ws.title)
    if not kind: continue
    rows = ws.iter_rows(values_only=True); hdr = next(rows); idx = {h: i for i, h in enumerate(hdr)}
    for r in rows:
        if not r or not r[idx['등록ID']]: continue
        items.append({'shopType': kind, 'shopId': str(r[idx['등록ID']]), 'priority': int(r[idx['리뷰수(수집시점)']] or 0)})
print(f'{len(items)}개 (xlsx: {XLSX})')
if DRY: print(items[:3]); sys.exit(0)

email, pw = os.environ.get('ADMIN_EMAIL'), os.environ.get('ADMIN_PASSWORD')
if not email or not pw: sys.exit('ADMIN_EMAIL / ADMIN_PASSWORD 환경변수가 필요합니다')
token = call('POST', '/auth/login', {'email': email, 'password': pw})['token']
total_updated, skipped = 0, []
for i in range(0, len(items), 500):
    res = call('POST', '/admin/outreach/bulk', {'items': items[i:i + 500]}, token)
    total_updated += res['updated']; skipped += res['skipped']
print(f'updated {total_updated}, skipped {len(skipped)}')
if skipped: print('skipped:', skipped[:20])
