# API 퍼징 — 이상한 입력에 500 이 나오거나 스크립트가 저장되면 버그. python 으로 JSON 을 정확히 보낸다.
import json, urllib.request, urllib.error, sys, os
B = "https://snowpan.onrender.com"
def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(B + path, data=data, method=method, headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()
    except Exception as e: return 0, str(e)[:120]
st, body = call("POST", "/api/auth/login", {"email": os.environ.get("U_EMAIL","reviewer@snowpan.kr"), "password": os.environ.get("U_PW","Snowpan-Review-2026")})
tok = json.loads(body).get("token") if st == 200 else None
print("login", st, "token" if tok else "NO TOKEN")
cases = [
 ("POST","/api/community",{"title":"","content":""}),
 ("POST","/api/community",{"title":"가"*300,"content":"x","category":"free","sport":"ski"}),
 ("POST","/api/community",{"title":"t","content":"c","category":"nope","sport":"ski"}),
 ("POST","/api/community",{"title":["a"],"content":{"x":1},"category":"free","sport":"ski"}),
 ("POST","/api/products",{"name":"x","price":-5,"category":"used"}),
 ("POST","/api/products",{"name":"x","price":"abc","category":"used"}),
 ("POST","/api/products",{"name":"x"*500,"price":10**12,"category":"used","image":"javascript:alert(1)"}),
 ("POST","/api/chat/rooms",{"targetUserId":"zzz"}),
 ("POST","/api/chat/rooms",{"targetUserId":None}),
 ("POST","/api/reports",{"type":"post","targetId":"nope","reason":""}),
 ("POST","/api/reports",{"type":"nope","targetId":"00000000-0000-0000-0000-000000000000","reason":"spam"}),
 ("PUT","/api/auth/profile",{"nickname":"<script>alert(1)</script>"}),
 ("PUT","/api/auth/profile",{"nickname":"a"}),
 ("PUT","/api/auth/profile",{"profileImage":"javascript:alert(1)"}),
 ("PUT","/api/auth/profile",{"role":"admin"}),
 ("POST","/api/community/00000000-0000-0000-0000-000000000000/comments",{"content":"x"}),
 ("POST","/api/products/00000000-0000-0000-0000-000000000000/wishlist",None),
 ("POST","/api/blocks",{"userId":"not-uuid"}),
 ("GET","/api/community?limit=99999",None),
 ("GET","/api/community?page=-1&limit=abc",None),
 ("GET","/api/products?category=used&page=-1&limit=abc",None),
 ("GET","/api/search?q=%27%22%3E%3Cscript%3E",None),
 ("GET","/api/search?q="+"a"*2000,None),
 ("GET","/api/community/not-a-uuid",None),
 ("GET","/api/products/not-a-uuid",None),
 ("GET","/api/auth/seller/not-a-uuid",None),
 ("GET","/api/ski-shops?resortId=%27%20OR%201%3D1--",None),
 ("GET","/api/rentals?resort=x&page=999999",None),
 ("DELETE","/api/community/00000000-0000-0000-0000-000000000000",None),
 ("PUT","/api/products/00000000-0000-0000-0000-000000000000",{"price":1}),
]
bad = 0
for m, p, b in cases:
    st, body = call(m, p, b, tok)
    flag = ""
    if st >= 500 or st == 0: flag = "  <-- 500/오류"; bad += 1
    edge_block = st == 403 and body.lstrip().lower().startswith("<!doctype html")  # Render/Cloudflare 엣지 WAF 차단 페이지(HTML) — 앱에 닿기 전 차단이라 오탐
    if "<script>" in body and not edge_block: flag += "  <-- 스크립트 반영"; bad += 1
    if edge_block: flag += "  (엣지 WAF 차단, 정상)"
    print(f"{st} {m:6} {p[:60]:60} {body.replace(chr(10),' ')[:60]}{flag}")
# 프로필에 스크립트가 남았는지
st, body = call("GET", "/api/auth/profile", None, tok)
if "<script>" in body: print("!! 프로필에 스크립트 저장됨"); bad += 1
print(f"\nFUZZ: {'문제 없음' if bad == 0 else str(bad)+'건 확인 필요'}")
sys.exit(1 if bad else 0)
