import UIKit
import UserNotifications
import Capacitor
import FirebaseCore
import FirebaseMessaging

// 푸시 알림(FCM) — 백엔드는 firebase-admin 으로 FCM 토큰에 보낸다(안드로이드와 같은 경로).
// APNs 토큰을 Firebase 에 넘기면 FCM 토큰이 나오고, 그걸 Capacitor 푸시 플러그인에 전달해 웹(push.ts)이 서버에 저장한다.
// Firebase 는 GoogleService-Info.plist 가 실제 파일일 때만 초기화한다(자리표시자면 건너뜀 → 앱은 정상, 푸시만 없음).
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let options = FirebaseOptions(contentsOfFile: path),
           options.googleAppID.hasPrefix("1:") {
            FirebaseApp.configure(options: options)
            Messaging.messaging().delegate = self
        }
        return true
    }

    // APNs 토큰 → Firebase 에 전달, FCM 토큰을 받아 Capacitor 에 알림
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        guard FirebaseApp.app() != nil else {
            // Firebase 미설정(자리표시자 plist) — APNs 원시 토큰을 FCM 토큰인 척 넘기면 서버 발송이 실패하므로 등록 실패로 처리
            NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: NSError(domain: "snowpan.push", code: 1, userInfo: [NSLocalizedDescriptionKey: "Firebase not configured"]))
            return
        }
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let error = error {
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
            } else if let token = token {
                NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
            }
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // FCM 토큰이 갱신되면 다시 전달
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        if let token = fcmToken {
            NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {
        // 앱을 열면 아이콘 배지와 알림센터의 스노우판 알림을 비운다 (배지 1 이 안 사라진다는 신고 2026-09-30). 서버도 읽음 처리 때 배지를 0 으로 맞춘다.
        application.applicationIconBadgeNumber = 0
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
        // 아이폰 기본 뒤로가기 제스처(왼쪽 끝에서 스와이프) — WKWebView 는 기본 꺼져 있어 켜 준다.
        // SPA(react-router)의 pushState 이동도 WebKit 히스토리에 쌓여 스와이프로 뒤로 간다. (사장님 요청 2026-09-27)
        // SceneDelegate 를 쓰는 앱이라 AppDelegate.window 는 비어 있을 수 있음 — 연결된 모든 씬의 윈도우를 훑는다
        var roots: [UIViewController?] = [window?.rootViewController]
        for scene in UIApplication.shared.connectedScenes {
            if let ws = scene as? UIWindowScene { roots.append(contentsOf: ws.windows.map { $0.rootViewController }) }
        }
        for root in roots { enableSwipeBack(in: root) }
    }
    private func enableSwipeBack(in vc: UIViewController?) {
        if let bridge = vc as? CAPBridgeViewController { bridge.webView?.allowsBackForwardNavigationGestures = true; return }
        for child in vc?.children ?? [] { enableSwipeBack(in: child) }
        if let presented = vc?.presentedViewController { enableSwipeBack(in: presented) }
    }
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
