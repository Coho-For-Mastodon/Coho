# Default ProGuard rules for the Wear module
-keepattributes *Annotation*
-keep class place.coho.app.wear.api.models.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**
