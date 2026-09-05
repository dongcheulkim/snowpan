# 매장 시딩 스크립트

공개 영업정보(상호·주소·전화·영업시간·링크)로 매장을 관리자 계정으로 일괄 등록하고, 사장님이 "직접 관리하기"(사업자등록증)로 가져가게 하는 흐름.
사진·소개글·리뷰는 저장하지 않는다(소개글은 상호 식별에만 사용).

1. `python3 seed_prep.py ~/Desktop/검토.csv review overrides.json` — 상호 복원·정규화·중복 병합 → 검토 CSV (처리=등록/제외)
   - `SEED_SRC` 환경변수로 원본 CSV 경로 지정 가능. `unresolved` 모드는 상호를 못 찾은 행만 출력.
   - `overrides.json`: 네이버ID → 상호 수기 지정. 값 `?` = 원본 유지(미확인), `!사유` = 제외.
2. `python3 seed_import.py --dry-run` → 페이로드 확인, `--limit 1` 로 1건 테스트 후 전체 실행. 관리자 비번은 `SNOWPAN_ADMIN_PW` 환경변수.
   - 결과 `seed_result.csv`(재실행 시 완료분 스킵), `seed_rollback.txt`(등록 ID).
3. 되돌리기: `python3 seed_rollback.py` — seed_rollback.txt 의 매장 전부 삭제.
