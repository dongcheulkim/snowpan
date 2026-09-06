# 시딩 등록분에 원본 '겸업' 열 → extraKinds 적용 (관리자 PUT, 증빙 면제). seed_result.csv + 통합 CSV 기준.
import csv, json, os, sys, time, unicodedata, urllib.request
n=lambda s: unicodedata.normalize('NFC', s or '')
API='https://snowpan.onrender.com/api'
SRC=os.environ.get('SEED_SRC', os.path.expanduser('~/Downloads/스키샵_렌탈샵_정비샵_전국목록_통합.csv'))
def req(m,p,body=None,tok=None):
    d=json.dumps(body,ensure_ascii=False).encode() if body is not None else None
    rq=urllib.request.Request(API+p,data=d,method=m,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+tok} if tok else {})})
    with urllib.request.urlopen(rq,timeout=30) as r: return json.loads(r.read().decode() or '{}')
by_nid={n(r['네이버ID']):r for r in csv.DictReader(open(SRC,encoding='utf-8-sig'))}
res=[r for r in csv.DictReader(open('seed_result.csv',encoding='utf-8')) if r['status']=='ok']
PATH={'skishop':'/ski-shops','repair':'/repair-shops','rental':'/rentals'}
plan=[]
for r in res:
    o=by_nid.get(n(r['naverId'])); g=n(o['겸업']) if o else ''
    ek=[k for word,k in (('판매','skishop'),('렌탈','rental'),('정비','repair')) if word in g and k!=r['kind']]
    if ek: plan.append((r['kind'],r['id'],r['name'],ek))
print('적용 대상',len(plan),'/',len(res))
if '--dry-run' in sys.argv:
    import collections; print(collections.Counter((k,','.join(e)) for k,_,_,e in plan)); sys.exit(0)
tok=req('POST','/auth/login',{'email':'help.snowpan@gmail.com','password':os.environ['SNOWPAN_ADMIN_PW']})['token']
ok=0
for kind,sid,name,ek in plan:
    try: req('PUT',f'{PATH[kind]}/{sid}',{'extraKinds':ek},tok); ok+=1
    except Exception as e: print('FAIL',kind,name,e)
    time.sleep(0.25)
print('완료',ok)
