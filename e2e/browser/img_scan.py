import json, re, urllib.request, concurrent.futures as cf
B="https://snowpan.onrender.com"
def get(p):
    with urllib.request.urlopen(B+p, timeout=30) as r: return json.loads(r.read().decode())
urls={}
posts=get("/api/community?limit=30"); posts=posts.get("posts") if isinstance(posts,dict) else posts
for p in posts:
    try: d=get(f"/api/community/{p['id']}"); d=d.get("post") or d
    except Exception: continue
    for u in (d.get("images") or "").split(","):
        if u.strip(): urls[u.strip()]=f"community:{d.get('title','')[:16]}"
    pi=(d.get("user") or {}).get("profileImage")
    if pi: urls[pi]=f"profile:{(d.get('user') or {}).get('nickname')}"
prods=get("/api/products?category=used&limit=40")
for p in (prods.get("products") if isinstance(prods,dict) else prods):
    for u in re.findall(r"https?://[^\s,\"]+", json.dumps(p, ensure_ascii=False)): urls[u]=f"used:{p.get('name','')[:16]}"
def head(u):
    try:
        with urllib.request.urlopen(urllib.request.Request(u), timeout=40) as r: return u, r.status, len(r.read()), r.headers.get("Content-Type")
    except Exception as e: return u,0,0,str(e)[:40]
rows=[]
with cf.ThreadPoolExecutor(8) as ex:
    for row in ex.map(head, list(urls)): rows.append(row)
rows.sort(key=lambda r:-r[2]); total=sum(r[2] for r in rows)
print(f"files={len(rows)} total={total/1024/1024:.1f}MB avg={total/max(1,len(rows))/1024:.0f}KB big(>800KB)={sum(1 for r in rows if r[2]>800_000)} bad={sum(1 for r in rows if r[1]!=200)}")
for u,st,size,ct in rows[:8]: print(f"  {size/1024:.0f}KB {ct} {urls[u]} …{u[-28:]}")
