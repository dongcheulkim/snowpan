# 시딩 등록분 전체 삭제 (seed_rollback.txt 기준) — 사장님 검토 전 원상복구
import json, time, urllib.request, urllib.error, os, sys
API='https://snowpan.onrender.com/api'
def req(m, p, body=None, tok=None):
    d=json.dumps(body).encode() if body is not None else None
    rq=urllib.request.Request(API+p, data=d, method=m, headers={'Content-Type':'application/json', **({'Authorization':'Bearer '+tok} if tok else {})})
    try:
        with urllib.request.urlopen(rq, timeout=30) as r: return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()
st,d=req('POST','/auth/login',{'email':'help.snowpan@gmail.com','password':os.environ['SNOWPAN_ADMIN_PW']}); tok=json.loads(d)['token']
PATH={'rental':'/rentals','skishop':'/ski-shops','repair':'/repair-shops'}
lines=[l.split(' ',2) for l in open('seed_rollback.txt',encoding='utf-8').read().splitlines() if l.strip()]
ok=fail=0
for i,(kind,sid,name) in enumerate(lines,1):
    for a in range(3):
        st,d=req('DELETE',f'{PATH[kind]}/{sid}',None,tok)
        if st==429: time.sleep(65); continue
        break
    if st==200: ok+=1
    else: fail+=1; print('FAIL',st,kind,sid,name,d[:100])
    if i%50==0: print(f'{i}/{len(lines)} ok={ok} fail={fail}')
    time.sleep(0.4)
print(f'롤백 완료 ok={ok} fail={fail}')
if fail==0: os.rename('seed_result.csv','seed_result.rolledback.csv'); os.rename('seed_rollback.txt','seed_rollback.rolledback.txt')
