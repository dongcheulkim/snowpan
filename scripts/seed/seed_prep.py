# -*- coding: utf-8 -*-
# 스노우판 매장 시딩 전처리 — 상호 복원 + 정규화 + 중복 병합 → 검토용 CSV
# 규칙: 상호가 검색어(곤지암렌탈샵 등)면 소개글/주소 건물명/홈페이지·인스타에서 실제 상호를 복원.
#       소개글·리뷰수·네이버분류는 식별용으로만 쓰고 저장하지 않는다.
import csv, re, sys, json, collections, unicodedata, os

SRC = os.environ.get('SEED_SRC', os.path.expanduser('~/Downloads/스키샵_렌탈샵_정비샵_전국목록.csv'))  # 원본 CSV (Numbers 에서 CSV 내보내기)
OUT = sys.argv[1] if len(sys.argv) > 1 else '/Users/jason/Desktop/스노우판_매장등록_검토.csv'
MODE = sys.argv[2] if len(sys.argv) > 2 else 'review'   # review | unresolved

RESORTS = {  # 파일 리조트명 → (prod 리조트명, prod id, 지역칩)
  '곤지암리조트': ('곤지암리조트','b0f97e29-18f5-4362-944b-2892f0dd5194','경기'),
  '무주덕유산리조트': ('무주덕유산','a94f2248-0399-4725-a405-594fde559be5','전라'),
  '비발디파크': ('비발디파크','399f95ea-d69f-48a2-8513-b2176f804d59','강원'),
  '지산리조트': ('지산리조트','18755992-4b83-4f01-896d-ff741740ad1a','경기'),
  '휘닉스평창': ('휘닉스평창','33d7f97c-f646-47e3-b02c-b4b777caa100','강원'),
  '하이원리조트': ('하이원','84e7b558-590f-4a09-a1d2-74d7f7211e6a','강원'),
  '알펜시아': ('알펜시아','658a430a-f0da-4656-9539-2575eaf5a63e','강원'),
  '웰리힐리파크': ('웰리힐리파크','559d447e-a786-4b62-8459-29160313c076','강원'),
  '오크밸리': ('오크밸리','d1c71510-6ebb-4828-b0be-517e6701347a','강원'),
  '엘리시안강촌': ('엘리시안강촌','28cd428c-6a09-432b-a1a7-e2a799a28ae1','강원'),
  '에덴밸리리조트': ('에덴밸리','aa3f298a-b509-4bbc-95ca-229fbb79addc','경상'),
  '용평리조트': ('용평리조트','c3698070-b375-41e8-91b1-2d359f4e1990','강원'),
  '오투리조트': ('오투리조트','fe969b22-3976-4374-890c-ced1179d8055','강원'),
  '베어스타운': ('베어스타운', None, '경기'),
}
AREA_MAP = {'강원':'강원','경기':'경기','서울':'서울','인천':'경기','전북':'전라','전남':'전라','경남':'경상','경북':'경상','부산':'경상','대구':'경상','울산':'경상','충북':'충청','충남':'충청','대전':'충청','세종':'충청'}
KIND_MAP = {'렌탈':'rental','판매(스키샵)':'skishop','정비':'repair'}

RESORT_WORDS = ['곤지암리조트','곤지암스키장','곤지암','비발디파크','비발디','지산리조트','지산스키장','지산포레스트','지산','휘닉스평창','휘닉스파크','휘닉스','하이원리조트','하이원','무주덕유산리조트','무주덕유산','덕유산','무주리조트','무주','알펜시아','웰리힐리파크','웰리힐리','오크밸리','엘리시안강촌','엘리시안','강촌','에덴밸리리조트','에덴밸리','베어스타운','용평리조트','용평','오투리조트','오투','대명','소노벨','소노','양지파인리조트','양지파인']
GENERIC_WORDS = ['스키장','리조트','렌탈샵','렌탈','스키샵','대여점','대여','샵','프리미엄','공식','인증','추천','최저가','네이버예약','예약','1위','스키보드','스키·보드','스키/보드','스키','보드','스노우보드','장비','의류','전문','업체','매장','본점','직영점','직영','점','호점','스토어','시즌','신상','고객센터','최고','저희','안녕하세요','여러분','겨울','스포츠','레저','인근','앞','바로','옆','입구','초입','리프트권','할인','신규','오픈','스키복','보드복','헬멧','튜닝','왁싱','정비','수리','새제품','전수량','24시간','24시','저렴한','착한','가성비','할인점','아울렛','도매','소매','판매','정품','수입','국내외']
STOP_TOKENS = set(RESORT_WORDS + GENERIC_WORDS + ['대한민국','전화','중에','자랑','찾는다면','에서','최초','단','분','하우스','정문','삼거리','바로','앞에','옆에','근처','인근에','위치한','위치해','스키장에서','리조트에서','리조트와','스키장과','고객님','고객님들','여러분의','저희는','우리','오늘','지금','매일','연중무휴','휴무','시즌권','리프트','셔틀','셔틀버스','픽업','주차','무료','공식','인증','업체','전문점','전문업체','추천','예약','네이버','블로그','카카오','카톡','문의','상담','환영합니다','감사합니다','드립니다','있습니다','합니다','됩니다','해드립니다','도전','최저가','가격','할인','이벤트','프로모션','패키지','신상','신규','오픈','장비','의류','스키복','보드복','헬멧','고글','장갑','부츠','데크','바인딩','입니다','합니다','있습니다','오신','환영','감사','찾아주셔서','위치','위치한','있는','오세요','드립니다','제공','서비스','품질','최선','만족','경험','특별한','이유','같은자리','같은쥔장','운영','년째','년차','전국','최초','전','신상프리미엄','벌','커플','부츠','투보아','원보아','나이트로','버튼코리아','StepOn','Elan','제작','기업','겨울운동','강습','한번','설명','늘','최대','전화','톡톡','문의','홈페이지','긴급문의','거리','분','성지','편리한','세련된','시설','차별화된','이용','혜택','재방문','많은','거부한다','평범한','즐기는','귀찮은','즐거운','체형','맞춤','보유','어린이','여성','성인','모두','OK','가격','거품','싹','뺏습니다','독점','취향저격','MZ','시즌을','종료합니다','부로','일부로','규모의','초대형','평','매년','신상장비와','취급','브랜드','전시','구비','되어','모두','도전합니다','보답하겠습니다','부문','판매수','연속','네이버스토어','네이버','스마트스토어','예약','스키장렌탈샵','렌탈샵은','렌탈샵에','렌탈샵을','렌탈샵이'])

def nfc(s): return unicodedata.normalize('NFC', s or '')

GEN = r'(?:스키장|리조트|파크)?\s*(?:공식|프리미엄|대표)?\s*(?:렌탈샵|렌탈|스키샵|대여점|스키강습센터|스키강습|강습)?'
RES_ALT = '|'.join(sorted(map(re.escape, RESORT_WORDS), key=len, reverse=True))
PREFIX_RE = re.compile(r'^(?:' + RES_ALT + r')' + GEN + r'\s*[&·/,\-]?\s*')
LEAD_GEN_RE = re.compile(r'^(?:렌탈샵|렌탈|스키샵|대여점|공식|프리미엄|대표|스키강습센터|스키강습|강습|스키보드강습)\s*[&·/,\-]?\s*')
TRAIL_GEN_RE = re.compile(r'(?:\s+(?:렌탈샵|렌탈|스키샵|대여점|스키강습센터|스키강습|강습|센터|스키보드강습)|\s*스키샵\s*[&·/]?\s*렌탈샵)\s*$')
TRAIL_RES_RE = re.compile(r'\s*[&·/,\-]?\s*(?:' + RES_ALT + r')' + GEN + r'\s*$')

def strip_generic(name):
    """리조트명+검색어 블록(곤지암스키장렌탈샵, 비발디파크 렌탈샵, 무주스키샵& 등)을 앞뒤에서 떼어낸 고유 상호.
    '하이원탑'처럼 리조트명이 붙은 한 단어 고유명은 그대로 둔다. 남는 게 없으면 ''(검색어뿐)."""
    s = nfc(name)
    s = re.sub(r'[\[\]\(\)【】「」]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    orig = s
    for _ in range(4):
        prev = s
        m = PREFIX_RE.match(s)
        if m:
            rest = s[m.end():]
            attached_plain = (m.group(0) == s[:len(m.group(0))]) and not re.search(r'(스키장|리조트|파크|렌탈샵|렌탈|스키샵|대여점|강습|\s|[&·/,\-])', m.group(0))
            # 리조트명만 딱 붙은 한 단어(하이원탑·오투패밀리·강촌슈퍼맨) → 고유명으로 보고 유지
            if attached_plain and ' ' not in orig and not re.search(r'렌탈샵|렌탈|스키샵|대여점|강습', rest):
                break
            s = rest
        s = LEAD_GEN_RE.sub('', s)
        s = TRAIL_RES_RE.sub('', s)
        s = TRAIL_GEN_RE.sub('', s)
        s = s.strip(' &·/,-')
        if s == prev: break
    s = re.sub(r'\s+', ' ', s).strip(' &·/,.-!~')
    if s in ('', '스키','보드','샵','장비','대여','점','본점','매장','스포츠','1호점','2호점','1층','2층','공식','프리미엄','렌탈샵','스키샵','렌탈','강습'):
        return ''
    return s

def is_generic(name, counts):
    return strip_generic(name) == '' or counts.get(name, 0) >= 3

def tokens_from(text):
    return [t for t in re.split(r'[\s,.!?~:;\[\]\(\)【】「」/"\'·\-|*<>#&+=]+', nfc(text)) if t]

def clean_candidate(c):
    c = strip_generic(c)
    c = re.sub(r'(입니다|입니다\.|를|을|은|는|이|가|에서|에|의|으로|로|와|과|도|만|까지|부터)$', '', c) if len(c) > 2 else c
    c = c.strip(' -·,./!~')
    return c

def plausible(c):
    if not c or len(c) < 2 or len(c) > 16: return False
    if c in STOP_TOKENS: return False
    if re.fullmatch(r'[\d\W_]+', c): return False
    if re.search(r'(층|호|번지|번길|로|길)$', c) and re.search(r'\d', c): return False
    if any(c.endswith(x) for x in ('빌딩','상가','타워','아파트','플라자','센터','오피스텔','프라자','회관','마트')) and len(c) <= 6: return False
    if c.endswith(('입니다','합니다','습니다','하세요','드려요','세요','해요','예요','에요')): return False
    return True

def from_address(addr):
    """도로명주소 뒤에 붙은 건물명/상호 (예: '도척윗로 166 W스키샵' → 'W스키샵')."""
    a = nfc(addr)
    m = re.search(r'\d+(?:-\d+)?\s+(.+)$', a)
    if not m: return ''
    tail = m.group(1).strip()
    tail = re.sub(r'\b(지하)?\d+층\b|\b\d+호\b|\b[A-Za-z]?\d+동\b|\(.*?\)', ' ', tail)
    tail = re.sub(r'\s+', ' ', tail).strip()
    c = clean_candidate(tail)
    return c if plausible(c) else ''

INTRO_PATTERNS = [
    r'\[([^\]]{2,30})\]',                                   # [코코넛렌탈샵 - ...]
    r'(?:렌탈샵|대여점|스키샵|프리미엄샵)\s+([가-힣A-Za-z0-9]{2,14})(?=\s|입니다|를|을|은|는|이|가|에서|에|!|,|\.|$)',   # 곤지암렌탈샵 청춘스키
    r'([가-힣A-Za-z0-9]{2,12})(?:렌탈샵|대여점|스키샵)(?=\s|입니다|-|에|은|는|을|를|!|,|\.|$)',   # 코코넛렌탈샵
    r'저희\s+([가-힣A-Za-z0-9]{2,14})(?:는|은|이|가|에서|를|을|,|\s)',       # 저희 청춘스키는
    r'([가-힣A-Za-z0-9]{2,14})(?:입니다|를 찾아주셔서|을 찾아주셔서|에 오신 것을)',   # 장비좋은집입니다
    r'안녕하세요[.,!]?\s*([가-힣A-Za-z0-9 ]{2,20}?)(?:입니다|이에요|예요)',
]

def from_intro(intro):
    text = nfc(intro)[:200]
    for pat in INTRO_PATTERNS:
        for m in re.finditer(pat, text):
            c = clean_candidate(m.group(1))
            if plausible(c): return c
    return ''

HANDLE_KO = {  # 홈페이지 도메인/인스타 핸들 → 한글 상호 (파일에서 본 것들만 수기)
  'megaphonesnow':'메가폰스노우','megaphone':'메가폰','monstersnow':'몬스터스노우','konjiammonster':'몬스터스노우','monster':'몬스터','coconutski':'코코넛렌탈샵','coconut':'코코넛',
  'brothers':'브라더스','brothersgonjiam':'브라더스','winter-story':'겨울이야기','winterstory':'겨울이야기','ski2':'겨울이야기','bossrentalshop':'보스렌탈샵','boss':'보스',
  'banana':'바나나스키','james':'클럽제임스보드','jboard':'클럽제임스보드','ione':'아이원','ionesk':'아이원','vski':'V스키','ddaengski':'땡스키','ganjiboarder':'간지보더','ganji':'간지보더',
  'inssa':'인싸','cestsibon':'쎄시봉','drsnow':'닥터스노우','dr.snow':'닥터스노우','wskishop':'W스키','w-ski':'W스키','ski24':'스키24','gonjiam':'','gonjiamrent':'',
}

def handle_of(url):
    u = nfc(url).strip()
    if not u: return ''
    u = u.split(',')[0].strip()
    m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', u)
    if m: return m.group(1)
    m = re.search(r'https?://(?:www\.)?([^/]+)', u)
    if m:
        host = m.group(1)
        if any(x in host for x in ('smartstore.naver', 'naver.com', 'kakao.com', 'imweb.me', 'cafe24', 'modoo.at', 'blog.', 'booking')):
            m2 = re.search(r'(?:smartstore\.naver\.com|modoo\.at)/([A-Za-z0-9_\-.]+)', u)
            if m2: return m2.group(1)
            m3 = re.match(r'([A-Za-z0-9\-]+)\.(?:imweb\.me|cafe24\.com)', host)
            if m3: return m3.group(1)
            return ''
        return host.split('.')[0]
    return ''

def from_handles(insta, home):
    for h in (handle_of(insta), handle_of(home)):
        if not h: continue
        key = h.lower().rstrip('_')
        key2 = re.sub(r'[_\-]?(gonjiam|konjiam|jisan|vivaldi|snow|ski|shop|rental|official|2023|2024|2025|7107|vd|a2025)$', '', key)
        for k in (key, key2):
            if k in HANDLE_KO and HANDLE_KO[k]: return HANDLE_KO[k], h
    return '', (handle_of(insta) or handle_of(home))

def clean_hours(h):
    h = nfc(h).strip()
    if not h: return ''
    parts = [p.strip() for p in h.split(';') if p.strip()]
    times = {}
    notes = []
    for p in parts:
        m = re.match(r'^(월|화|수|목|금|토|일)\s+(\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}|정기휴무|휴무)$', p)
        if m: times[m.group(1)] = m.group(2)
        else: notes.append(p)
    out = []
    if len(times) == 7 and len(set(times.values())) == 1:
        out.append('매일 ' + list(times.values())[0])
    elif times:
        out.append(', '.join(f'{d} {t}' for d, t in times.items()))
    out += notes
    s = '; '.join(out)
    return s[:200]

def first_url(s):
    for u in [x.strip() for x in nfc(s).split(',')]:
        if re.match(r'https?://', u): return u
    return ''

def insta_handle(s):
    m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', nfc(s))
    return m.group(1) if m else ''

def norm_addr_key(r):
    j = nfc(r['지번주소']).strip()
    if j: return re.sub(r'\s+', '', j)
    a = nfc(r['주소']).strip()
    a = re.sub(r'\s*(\d+층|\d+호|[A-Za-z]?\d+동|\(.*?\)).*$', '', a)
    return re.sub(r'\s+', '', a)

rows = list(csv.DictReader(open(SRC, encoding='utf-8-sig')))
counts = collections.Counter(nfc(r['상호']) for r in rows)

# 수기 오버라이드 (네이버ID → 상호) — 자동 추출이 못 잡은 것들을 직접 읽고 정함
OVERRIDES = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}

out = []
unresolved = []
for r in rows:
    r = {k: nfc(v) for k, v in r.items()}
    nid = r['네이버ID']
    orig = r['상호'].strip()
    kind = KIND_MAP.get(r['업종'], '')
    evidence = []
    if nid in OVERRIDES and OVERRIDES[nid].startswith('!'):
        name, conf = orig, '제외'
        evidence.append(OVERRIDES[nid][1:])
    elif nid in OVERRIDES and OVERRIDES[nid] == '?':
        name, conf = orig, '미확인'
        evidence.append('단서 부족 — 사장님 확인 필요')
        unresolved.append(r)
    elif nid in OVERRIDES:
        name, conf = OVERRIDES[nid], '수기'
        evidence.append('수기 확인')
    elif not is_generic(orig, counts):
        core = strip_generic(orig)
        if core and core != orig and len(core) >= 2:
            name, conf = core, '접두어제거'; evidence.append(f'원본 "{orig}"')
        else:
            name, conf = orig, '원본'
    else:
        cands = []
        hk, hraw = from_handles(r['인스타'], r['홈페이지'])
        if hk: cands.append(('홈페이지/인스타', hk))
        a = from_address(r['주소'])
        if a: cands.append(('주소', a))
        i = from_intro(r['소개글'])
        if i: cands.append(('소개글', i))
        if cands:
            name = cands[0][1]; conf = '자동'
            evidence = [f'{s}:{c}' for s, c in cands]
            # 소개글·주소·핸들 둘 이상이 같은 걸 가리키면 신뢰도 상향
            if len({c for _, c in cands}) < len(cands): conf = '자동(교차확인)'
        else:
            name, conf = orig, '미확인'
            evidence.append('단서 없음' + (f' (handle={hraw})' if hraw else ''))
            unresolved.append(r)
    # 상호 최종 정리
    name = re.sub(r'\s+', ' ', name).strip(' -·,./!~')
    if not name: name = orig
    if conf == '제외':
        action, reason = '제외', evidence[-1]
    elif r['확인필요'].find('스키강습') >= 0:
        action, reason = '제외', '네이버분류 스키강습 (렌탈 아님)'
    elif not kind:
        action, reason = '제외', f'업종 매핑 불가: {r["업종"]}'
    elif not r['주소'].strip():
        action, reason = '제외', '주소 없음'
    else:
        action, reason = '등록', ''
    res = RESORTS.get(r['리조트'].strip(), None)
    resort_name = res[0] if res else (r['리조트'].strip() or '')
    resort_id = res[1] if res else ''
    area = AREA_MAP.get(r['지역'].strip(), r['지역'].strip() or (res[2] if res else ''))
    out.append({
        '처리': action, '사유': reason, '업종': kind, '상호': name, '원본상호': orig, '상호근거': ' / '.join(evidence), '신뢰도': conf,
        '지역': area, '리조트': resort_name, '리조트ID': resort_id or '', '주소': r['주소'].strip(), '전화': r['전화'].strip(),
        '영업시간': clean_hours(r['영업시간']), '인스타': insta_handle(r['인스타']), '홈페이지': first_url(r['홈페이지']), '네이버링크': first_url(r['네이버링크']),
        '겸업': r['겸업'], '확인필요원문': r['확인필요'], '네이버ID': nid, '주소키': norm_addr_key(r), '중복': '',
    })

# 중복 병합: 같은 주소키 or (같은 상호 + 같은 리조트) → 정보 많은 행 유지
def score(o): return sum(bool(o[k]) for k in ('전화','영업시간','인스타','홈페이지')) + (1 if o['신뢰도'] not in ('미확인',) else 0) + (1 if o['업종']=='rental' else 0)
groups = collections.defaultdict(list)
for o in out:
    if o['처리'] != '등록': continue
    groups[('addr', o['주소키'])].append(o)
    groups[('name', o['상호'].replace(' ',''), o['리조트'])].append(o)
seen_drop = set()
for key, g in groups.items():
    if len(g) < 2: continue
    keep = max(g, key=score)
    for o in g:
        if o is keep or id(o) in seen_drop: continue
        if o['처리'] == '등록':
            o['처리'] = '제외'; o['사유'] = f'중복(같은 {"주소" if key[0]=="addr" else "상호"}) → "{keep["상호"]}"({keep["네이버ID"]})와 병합'
            seen_drop.add(id(o))
            # 병합: 비어있는 정보 채우기
            for k in ('전화','영업시간','인스타','홈페이지'):
                if not keep[k] and o[k]: keep[k] = o[k]
            if keep['신뢰도'] == '미확인' and o['신뢰도'] != '미확인': keep['상호'], keep['신뢰도'], keep['상호근거'] = o['상호'], o['신뢰도'], o['상호근거']

if MODE == 'unresolved':
    print(f'미확인 {len(unresolved)}건 / 전체 {len(rows)}')
    for r in unresolved:
        print(f"[{r['네이버ID']}] {r['상호']} | {r['리조트']} | 주소끝:{r['주소'][-16:]} | 인스타:{insta_handle(r['인스타'])} | 홈:{handle_of(r['홈페이지'])} | 소개:{(r['소개글'] or '')[:90].replace(chr(10),' ')}")
    sys.exit(0)

cols = ['처리','사유','업종','상호','원본상호','상호근거','신뢰도','지역','리조트','리조트ID','주소','전화','영업시간','인스타','홈페이지','네이버링크','겸업','확인필요원문','네이버ID']
with open(OUT, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader()
    for o in sorted(out, key=lambda o: (o['처리'] != '등록', o['업종'], o['리조트'], o['상호'])): w.writerow(o)
reg = [o for o in out if o['처리'] == '등록']
print(f'전체 {len(rows)} → 등록 {len(reg)} / 제외 {len(out)-len(reg)}')
print('제외 사유:', collections.Counter(o['사유'].split(' →')[0].split(' (')[0] for o in out if o['처리']=='제외').most_common())
print('등록 업종:', collections.Counter(o['업종'] for o in reg))
print('상호 신뢰도:', collections.Counter(o['신뢰도'] for o in reg))
changed = [o for o in reg if o['상호'] != o['원본상호']]
print(f'상호 변경 {len(changed)}건')
print('OUT:', OUT)
