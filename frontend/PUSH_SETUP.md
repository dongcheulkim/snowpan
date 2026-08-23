# FCM 푸시 알림 설정 (사장님 1회 작업)

앱(안드로이드)·서버 **코드는 전부 준비 완료**. 아래 3가지만 하면 푸시가 켜집니다.
안 해도 앱과 서버는 정상 작동합니다 — 푸시만 조용히 비활성 상태로 남습니다.

## 1) Firebase 프로젝트 + google-services.json
1. https://console.firebase.google.com → **프로젝트 만들기** (이름: 스노우판)
2. **Android 앱 추가** → 패키지명 `kr.snowpan.app` 입력 → `google-services.json` 다운로드
3. 그 파일을 **`frontend/android/app/google-services.json`** 위치에 넣기

## 2) Android Gradle 2줄 추가 (반드시 위 JSON 넣은 뒤!)
- `frontend/android/build.gradle` 의 `dependencies { }` 안에:
  ```
  classpath 'com.google.gms:google-services:4.4.2'
  ```
- `frontend/android/app/build.gradle` 맨 위 `apply plugin` 들 아래에:
  ```
  apply plugin: 'com.google.gms.google-services'
  ```
  > ⚠️ google-services.json 없이 이 2줄을 먼저 넣으면 빌드가 실패합니다. **JSON 먼저.**

## 3) 서버 FCM 서비스계정 키 (Render)
1. Firebase 콘솔 → **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성** → JSON 다운로드
2. Render → snowpan 백엔드 → **Environment** → 새 변수
   `FCM_SERVICE_ACCOUNT` = (다운로드한 JSON 파일 **내용 전체**를 그대로 값에 붙여넣기)
3. 저장 → 자동 재배포

## 4) 앱 재빌드
```
cd frontend && npm run app:sync
```
이후 Android Studio 에서 서명 빌드(AAB) → Play Console 업로드.

---

## 동작 방식 (참고 — 손댈 것 없음)
- 앱 로그인 시 알림 권한 요청 → 허용하면 FCM 토큰이 서버(`user.fcmToken`)에 저장됨.
- 발송은 백엔드 `utils/push.ts` 의 `sendPushToUser()` 가 담당하고, 이미 아래에 연결돼 있어 **자동 발송**됨:
  - 채팅 새 메시지(상대가 방을 안 보고 있을 때)
  - 중고거래 키워드 알림 / 관심 매물
  - 커뮤니티 댓글
  - 리뷰 등록
  - 관리자 알림(`notifyAdmins`)
- `FCM_SERVICE_ACCOUNT` env 가 없으면 발송은 조용히 no-op (에러 없음).
- 로그아웃 시 그 기기의 서버 토큰을 정리해 다른 사람에게 푸시가 안 갑니다.
- iOS 는 별도 설정(APNs 인증키 + Firebase iOS 앱) 필요 — 안드로이드 먼저.
