# 포스터 릴스 캡션 (유튜브 쇼츠 · 틱톡 · 인스타 릴스 공용, 2026-10-10)

세 곳 모두 같은 영상. 제목 줄은 플랫폼 글자 수에 맞춰 그대로 쓰고, 해시태그는 틱톡·쇼츠 5개 이내, 인스타 10개 이내.
공통 마지막 줄: 앱은 App Store·Google Play에서 "스노우판" 검색 · snowpan.kr

| 파일 | 제목(쇼츠·틱톡) | 설명 첫 줄 | 해시태그 |
|---|---|---|---|
| app_launch.mp4 | 스노우판 앱 출시, 정비·왁싱권 20명 이벤트 | 앱스토어·구글플레이에 올라왔어요. 10/25까지 신청, 27일 밤 9시 추첨 | #스노우판 #스키 #스노보드 #스키이벤트 #앱출시 |
| lesson_no_fee.mp4 | 강습 등록에 왜 수수료를 내야 하죠? | 중개 수수료 0원, 커뮤니티에서 강사와 직접 매칭 | #스키강습 #보드강습 #스키강사 #스노우판 #스키 |
| junior_badge.mp4 | 아이 스키복에 달린 색깔 배지의 정체 | 주니어 스키 기술등급제 10단계, 7등급 이상이면 레벨1 자동 취득 | #주니어스키 #스키등급제 #KSIA #스키교육 #스노우판 |
| cert_not_only_instructor.mp4 | 스키 자격증, 지도자만 따는 게 아니에요 | 레벨1 vs 티칭1 비교, 티칭2부터 리프트권 할인 | #스키자격증 #레벨1 #티칭1 #스키 #스노우판 |
| cert_level_vs_teaching.mp4 | 스키강사 자격증 레벨 vs 티칭, 뭐가 다를까 | 강습허가권 패찰에 필요한 필수 서류, 발급 기관과 혜택 비교 | #스키강사 #스키지도자 #스키자격증 #스노우판 #스키 |
| lesson_consumer_rights.mp4 | 스키 강습 신청 전 꼭 확인할 3가지 | 자격증·사업자등록·배상책임보험, 묻는 건 당연한 권리예요 | #스키강습 #스키레슨 #소비자권리 #스노우판 #스키 |
| group_vs_private.mp4 | 그룹레슨 vs 개인레슨, 뭐가 좋을까 | 가격·폐강·진도 차이와 예약 전 체크 3가지 | #스키레슨 #그룹레슨 #개인레슨 #스키강습 #스노우판 |
| muju_o2_seasonpass.mp4 | 무주×오투 시즌권 한 장에 두 리조트 | 통합권 가격·혜택 총정리, 2차 특가 10/24까지 | #무주덕유산리조트 #오투리조트 #시즌권 #무투시즌권 #스노우판 |
| ski_wear_fabric.mp4 | 스키복 아무거나 사면 후회하는 이유 | 하드쉘·소프트쉘·인슐레이티드, 내 라이딩에 맞는 원단 | #스키복 #보드복 #하드쉘 #소프트쉘 #스노우판 |
| ski_trip_checklist.mp4 | 스키장 가기 전 꼭 챙길 것 | 추위·자외선·체력·정설 타이밍·장비 어디서 빌릴지 | #스키장준비물 #스키장꿀팁 #스키초보 #스노우판 #스키 |

## 올리는 순서 (하루 1개, 저녁 7~9시)
1 ski_trip_checklist → 2 ski_wear_fabric → 3 app_launch → 4 group_vs_private → 5 lesson_consumer_rights → 6 junior_badge → 7 cert_not_only_instructor → 8 cert_level_vs_teaching → 9 lesson_no_fee → 10 muju_o2_seasonpass(10/24 전에)

## 2026-10-17 정렬·추가
- 파일명 앞 번호 = 인스타 업로드 순서(01 준비물 9/10 → 12 비발디 10/14). 무음 원본·음악버전_곡별·저장소 모두 같은 번호.
- 새 포스터 2개 추가: 11_phoenix_venue(휘닉스 행사 개최지 확정, 10/13), 12_vivaldi_seasonpass(비발디 시즌패스 NOL 선착순 10/14~11/8 — **11/8 전에 올릴 것**).

## 음악 버전 (2026-10-17, 사장님 "노래까지 가능할까")
- 바탕화면 `포스터_릴스/음악버전_Voltaic`(전자음·에너지) · `음악버전_Hyperfun`(밝은 업비트). 둘 중 하나 골라 올리기. 무음 원본은 그대로 두고 앱 안에서 유행 음원을 고르는 것도 방법(노출에 유리).
- 음원: Kevin MacLeod (incompetech.com), **CC BY 4.0 — 올릴 때 설명란에 아래 한 줄을 꼭 넣을 것**
  - Voltaic: `Music: Voltaic by Kevin MacLeod (incompetech.com), CC BY 4.0`
  - Hyperfun: `Music: Hyperfun by Kevin MacLeod (incompetech.com), CC BY 4.0`
- 합치기: `ffmpeg -i 영상.mp4 -ss 12 -i Voltaic.mp3 -filter_complex "[1:a]atrim=0:길이,afade=t=in:d=0.3,afade=t=out:st=길이-0.9:d=0.9,volume=-5dB,loudnorm=I=-14:TP=-1[m]" -map 0:v -map "[m]" -c:v copy -c:a aac -shortest out.mp4` (Voltaic 은 12초, Hyperfun 은 6초 지점부터)
- 2026-10-17 사장님 요청 "베이스 울리는 약간 느린 테크노" → `음악버전_BasementFloor`(98bpm, 묵직한 신스 베이스, 어둡고 그루비 — 1순위) · `음악버전_CutAndRun`(109bpm, 모던 클럽). 같은 Kevin MacLeod CC BY 4.0. 설명란 크레딧:
  - `Music: Basement Floor by Kevin MacLeod (incompetech.com), CC BY 4.0`
  - `Music: Cut and Run by Kevin MacLeod (incompetech.com), CC BY 4.0`
  - 예비곡(음원_CC-BY 폴더): Misuse(115, 다크 댄스), Ethernight Club(117, 새벽 클럽), Rocket(116, 유로테크)
- 곡 고르는 법: incompetech `pieces.json`(제목·bpm·feel·설명)을 받아 bpm·feel 로 거르고, ffmpeg `lowpass=f=120,volumedetect` 로 120Hz 이하 에너지를 재서 베이스 센 곡을 고름.
- 다른 곡 후보(같은 라이선스, 받아 둠): Electro Cabello(일렉트로 스윙), Dance Monster, Carefree(밝은 우쿨렐레), Cipher2(전자음)

## 2026-10-15 빠른 버전 (사장님 "더 짧고 빠르게")
- `specs_f/` 대본(슬라이드당 한 문장, 13~25초), 문장당 1.0~2.2초, 컷 간격 0.12초, 무음. `node src/kinetic.cjs specs_f/<이름>.json out`

## 2026-10-15 키네틱 버전 (사장님 "지루하다" 피드백)
- 포스터가 천천히 커지는 방식(narrate.cjs) 대신 `src/kinetic.cjs specs_k/<이름>.json out_k`: 문장마다 컷, 말하는 단어가 큰 글자로 켜짐(숫자 노랑·키워드 하늘색), 새 슬라이드 첫 문장에만 포스터를 보여주고 나머지는 사진 배경 + 글자. 대본은 `specs_k/`(짧게 다시 씀, 35~60초).
- **음성 없음**(사장님 결정 2026-10-15 "음성 빼자"): 문장 길이로 읽기 시간을 정하고(1.5~3.4초) 무음 트랙만 넣음. 올릴 때 앱에서 음악 선택. 음성을 다시 넣으려면 `VOICE=ko-KR-SunHiNeural node src/kinetic.cjs ...`.

## 만든 방법 (처음 버전)
- 원본: 인스타 @snowpan.kr 캐러셀 슬라이드(공식 API로 받음), 기간 지난 곤지암 시즌권·앰버서더 모집 2개는 제외
- 음성: 마이크로소프트 신경망 한국어 음성(edge-tts, 기본 ko-KR-SunHiNeural 여성 · ko-KR-InJoonNeural 남성, 키 불필요)으로 문장마다 합성, 자막은 같은 문장을 같은 타이밍에 표시. `python3 -m pip install --user edge-tts` 필요. 맥 내장 음성(say)은 ENGINE=say 로만 남겨둠(기계 티가 나서 미사용)
- 재생성: `node src/narrate.cjs specs/<이름>.json out` (남성 음성은 `VOICE=ko-KR-InJoonNeural`, 속도는 `RATE=+8%` 식으로) (대본은 specs 폴더, 문장을 고치면 음성·자막이 같이 바뀜)
- 더 자연스러운 목소리를 원하면 같은 대본으로 사장님이 직접 녹음하거나, 유료 TTS(타입캐스트 등)로 바꿔 끼우면 됨
