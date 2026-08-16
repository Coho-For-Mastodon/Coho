# ProGuard / R8 Rules for Coho

# Keep line numbers and source file attributes for stack trace reporting
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor Core & Plugin infrastructure
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}
-keep @interface com.getcapacitor.annotation.CapacitorPlugin
-keep @interface com.getcapacitor.annotation.PluginMethod
-keep @interface com.getcapacitor.annotation.ActivityCallback
-keep @interface com.getcapacitor.annotation.Permission
-keep @interface com.getcapacitor.NativePlugin

# Keep Coho Native Plugins & Bridges
-keep class place.coho.app.** { *; }
-keepclassmembers class place.coho.app.** {
    public <methods>;
    public <fields>;
}

# Keep WorkManager Workers
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# Keep Jetpack Glance App Widget classes & receivers
-keep class * extends androidx.glance.appwidget.GlanceAppWidgetReceiver
-keep class * extends androidx.glance.appwidget.GlanceAppWidget
-keep class * extends androidx.glance.appwidget.action.ActionCallback {
    public <init>();
}

# Keep ML Kit & Google Play Services reflection
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.wearable.** { *; }
