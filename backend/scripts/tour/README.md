# 해외 스키장 일괄 추가 (2026-10-12)

`add.cjs <batch.json>` — 각 항목의 위키백과 대표 사진·위키미디어 공용 검색 결과 중 상업 이용 가능 라이선스(CC BY/BY-SA/CC0/PD, NC·ND 제외)만 모아
'눈 점수'(사진 아래 60% 의 흰 픽셀 비율)가 높은 것을 골라 Bunny 에 올리고 `/overseas/resorts` 로 등록한다. 겨울 사진이 없으면 사진은 넣되 비공개.
- 토큰: 상위 폴더 `tok` 파일(관리자 access 토큰, 1시간 만료) — 커밋하지 않는다.
- `node add.cjs batch.json refresh slug1,slug2` — 등록된 항목 사진 다시 고르기(`SKIP_FIRST=1` 이면 2순위, `DRY=1` 출력만, `DEBUG=1` 후보 점수).
- `node sweep.cjs a.json b.json` — 등록된 사진 눈 점수 재검사. 단, 그늘진 설면은 점수가 낮게 나오니 마지막은 반드시 눈으로 확인(컨택트 시트).
- 설명문은 일반 상식 수준의 확정 정보만 썼고 가격은 넣지 않았다(사장님 "확실한 것만").
- sharp 필요: `npm i sharp` (이 폴더에서).
