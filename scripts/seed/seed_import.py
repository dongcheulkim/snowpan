# -*- coding: utf-8 -*-
# 검토 CSV(처리=등록)를 스노우판 실서비스에 관리자 API 로 시딩 등록 (claimable=true → "사장님 확인 전").
# 사용: python3 seed_import.py --dry-run | --limit N | (없음=전체)   결과: seed_result.csv / seed_rollback.txt
import csv, json, sys, time, urllib.request, urllib.error, os, getpass
API = 'https://snowpan.onrender.com/api'
CSV = '/Users/jason/Desktop/스노우판_매장등록_검토.csv'
DRY = '--dry-run' in sys.argv
LIMIT = int(sys.argv[sys.argv.index('--limit')+1]) if '--limit' in sys.argv else None
SKIP_DONE = set()
if os.path.exists('seed_result.csv'):
    for r in csv.DictReader(open('seed_result.csv', encoding='utf-8')):
        if r['status'] == 'ok': SKIP_DONE.add(r['naverId'])

def req(method, path, body=None, token=None):
    data = json.dumps(body, ensure_ascii=False).encode('utf-8') if body is not None else None
    rq = urllib.request.Request(API + path, data=data, method=method, headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(rq, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8') or '{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode('utf-8') or '{}')
        except Exception: return e.code, {}

KIND_LABEL = {'skishop': '스키·보드샵', 'repair': '정비샵', 'rental': '렌탈샵'}
def payload(r):
    kind = r['업종']; near = f"{r['리조트']} 인근 " if r['리조트'] else ''
    desc = f"{near}{KIND_LABEL[kind]}. 공개된 기본 정보로 등록된 매장으로 사장님 확인 전입니다. 정보가 다르거나 삭제를 원하시면 고객센터(info@snowpan.kr)로 알려주세요."
    base = {'name': r['상호'], 'address': r['주소'], 'claimable': True}
    for k, col in (('phone', '전화'), ('instagram', '인스타'), ('website', '홈페이지'), ('naverMap', '네이버링크'), ('hours', '영업시간')):
        if r[col]: base[k] = r[col][:200]
    if kind == 'skishop':
        return '/ski-shops', {**base, 'area': r['지역'], 'resort': r['리조트'] or None, 'description': desc}
    if kind == 'repair':
        return '/repair-shops', {**base, 'area': r['지역'], 'description': desc}
    if kind == 'rental':
        p = {**base, 'area': r['리조트'] or r['지역']}
        if r['리조트ID']: p['resortId'] = r['리조트ID']
        return '/rentals', p
    raise ValueError(kind)

rows = [r for r in csv.DictReader(open(CSV, encoding='utf-8-sig')) if r['처리'] == '등록' and r['네이버ID'] not in SKIP_DONE]
if LIMIT: rows = rows[:LIMIT]
print(f'대상 {len(rows)}건 (이미 완료 {len(SKIP_DONE)}건 제외)')
if DRY:
    seen = set()
    for r in rows:
        if r['업종'] in seen: continue
        seen.add(r['업종']); path, p = payload(r); print(path, json.dumps(p, ensure_ascii=False)[:600])
    import collections; print(collections.Counter(r['업종'] for r in rows)); sys.exit(0)

pw = os.environ.get('SNOWPAN_ADMIN_PW') or getpass.getpass('admin pw: ')
st, d = req('POST', '/auth/login', {'email': 'help.snowpan@gmail.com', 'password': pw})
tok = d.get('token'); assert st == 200 and tok, ('login failed', st, d)
resf = open('seed_result.csv', 'a', encoding='utf-8', newline=''); w = csv.writer(resf)
if resf.tell() == 0: w.writerow(['naverId', 'kind', 'id', 'name', 'status', 'error'])
rb = open('seed_rollback.txt', 'a', encoding='utf-8')
ok = fail = 0
for i, r in enumerate(rows, 1):
    path, p = payload(r)
    for attempt in range(3):
        st, d = req('POST', path, p, tok)
        if st == 429: print('429 — 65초 대기'); time.sleep(65); continue
        break
    if st == 201 and d.get('id') and d.get('claimable') is True and d.get('approved') is True:
        ok += 1; w.writerow([r['네이버ID'], r['업종'], d['id'], r['상호'], 'ok', '']); rb.write(f"{r['업종']} {d['id']} {r['상호']}\n")
    else:
        fail += 1; w.writerow([r['네이버ID'], r['업종'], d.get('id', ''), r['상호'], f'fail:{st}', json.dumps(d, ensure_ascii=False)[:200]]); print('FAIL', st, r['상호'], d)
    resf.flush(); rb.flush()
    if i % 25 == 0: print(f'{i}/{len(rows)} ok={ok} fail={fail}')
    time.sleep(0.5)
print(f'완료 ok={ok} fail={fail}')
