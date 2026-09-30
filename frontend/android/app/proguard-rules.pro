# Capacitor 브리지·플러그인 (리플렉션/JS 인터페이스로 호출되므로 이름 유지)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * { @com.getcapacitor.annotation.PermissionCallback <methods>; @com.getcapacitor.annotation.ActivityCallback <methods>; @com.getcapacitor.PluginMethod public <methods>; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class kr.snowpan.app.** { *; }
# WebView ↔ JS 인터페이스
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface, *Annotation*, Signature, InnerClasses, EnclosingMethod
# Firebase 메시징
-keep class com.google.firebase.messaging.** { *; }
-dontwarn com.google.android.gms.**
-dontwarn org.apache.**
