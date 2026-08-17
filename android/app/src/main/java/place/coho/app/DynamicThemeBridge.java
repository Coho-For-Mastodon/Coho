package place.coho.app;

import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that exposes the Android Material You dynamic accent color
 * and complete tonal palettes (Accent 1-3, Neutral 1-2) to the web layer.
 *
 * On API 31+ (Android 12+), reads the system wallpaper-derived Monet palettes
 * and constructs resolved Material 3 color schemes for light and dark modes.
 * On older versions, reports supported: false so the web app can fall back.
 */
@CapacitorPlugin(name = "DynamicThemeBridge")
public class DynamicThemeBridge extends Plugin {

    private String getColorHex(int resId) {
        int colorInt = ContextCompat.getColor(getContext(), resId);
        return String.format("#%06X", (0xFFFFFF & colorInt));
    }

    @PluginMethod
    public void getAccentColor(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            String hex = getColorHex(android.R.color.system_accent1_500);
            result.put("color", hex);
            result.put("supported", true);
        } else {
            result.put("color", null);
            result.put("supported", false);
        }

        call.resolve(result);
    }

    @PluginMethod
    public void getPalette(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            result.put("supported", false);
            result.put("accentColor", null);
            call.resolve(result);
            return;
        }

        try {
            result.put("supported", true);
            result.put("accentColor", getColorHex(android.R.color.system_accent1_500));

            // 1. Raw Tonal Palettes
            JSObject palettes = new JSObject();

            // Accent 1 (Primary)
            JSObject a1 = new JSObject();
            a1.put("0", getColorHex(android.R.color.system_accent1_0));
            a1.put("10", getColorHex(android.R.color.system_accent1_10));
            a1.put("50", getColorHex(android.R.color.system_accent1_50));
            a1.put("100", getColorHex(android.R.color.system_accent1_100));
            a1.put("200", getColorHex(android.R.color.system_accent1_200));
            a1.put("300", getColorHex(android.R.color.system_accent1_300));
            a1.put("400", getColorHex(android.R.color.system_accent1_400));
            a1.put("500", getColorHex(android.R.color.system_accent1_500));
            a1.put("600", getColorHex(android.R.color.system_accent1_600));
            a1.put("700", getColorHex(android.R.color.system_accent1_700));
            a1.put("800", getColorHex(android.R.color.system_accent1_800));
            a1.put("900", getColorHex(android.R.color.system_accent1_900));
            a1.put("1000", getColorHex(android.R.color.system_accent1_1000));
            palettes.put("accent1", a1);

            // Accent 2 (Secondary)
            JSObject a2 = new JSObject();
            a2.put("0", getColorHex(android.R.color.system_accent2_0));
            a2.put("10", getColorHex(android.R.color.system_accent2_10));
            a2.put("50", getColorHex(android.R.color.system_accent2_50));
            a2.put("100", getColorHex(android.R.color.system_accent2_100));
            a2.put("200", getColorHex(android.R.color.system_accent2_200));
            a2.put("300", getColorHex(android.R.color.system_accent2_300));
            a2.put("400", getColorHex(android.R.color.system_accent2_400));
            a2.put("500", getColorHex(android.R.color.system_accent2_500));
            a2.put("600", getColorHex(android.R.color.system_accent2_600));
            a2.put("700", getColorHex(android.R.color.system_accent2_700));
            a2.put("800", getColorHex(android.R.color.system_accent2_800));
            a2.put("900", getColorHex(android.R.color.system_accent2_900));
            a2.put("1000", getColorHex(android.R.color.system_accent2_1000));
            palettes.put("accent2", a2);

            // Accent 3 (Tertiary)
            JSObject a3 = new JSObject();
            a3.put("0", getColorHex(android.R.color.system_accent3_0));
            a3.put("10", getColorHex(android.R.color.system_accent3_10));
            a3.put("50", getColorHex(android.R.color.system_accent3_50));
            a3.put("100", getColorHex(android.R.color.system_accent3_100));
            a3.put("200", getColorHex(android.R.color.system_accent3_200));
            a3.put("300", getColorHex(android.R.color.system_accent3_300));
            a3.put("400", getColorHex(android.R.color.system_accent3_400));
            a3.put("500", getColorHex(android.R.color.system_accent3_500));
            a3.put("600", getColorHex(android.R.color.system_accent3_600));
            a3.put("700", getColorHex(android.R.color.system_accent3_700));
            a3.put("800", getColorHex(android.R.color.system_accent3_800));
            a3.put("900", getColorHex(android.R.color.system_accent3_900));
            a3.put("1000", getColorHex(android.R.color.system_accent3_1000));
            palettes.put("accent3", a3);

            // Neutral 1 (Surface / Background)
            JSObject n1 = new JSObject();
            n1.put("0", getColorHex(android.R.color.system_neutral1_0));
            n1.put("10", getColorHex(android.R.color.system_neutral1_10));
            n1.put("50", getColorHex(android.R.color.system_neutral1_50));
            n1.put("100", getColorHex(android.R.color.system_neutral1_100));
            n1.put("200", getColorHex(android.R.color.system_neutral1_200));
            n1.put("300", getColorHex(android.R.color.system_neutral1_300));
            n1.put("400", getColorHex(android.R.color.system_neutral1_400));
            n1.put("500", getColorHex(android.R.color.system_neutral1_500));
            n1.put("600", getColorHex(android.R.color.system_neutral1_600));
            n1.put("700", getColorHex(android.R.color.system_neutral1_700));
            n1.put("800", getColorHex(android.R.color.system_neutral1_800));
            n1.put("900", getColorHex(android.R.color.system_neutral1_900));
            n1.put("1000", getColorHex(android.R.color.system_neutral1_1000));
            palettes.put("neutral1", n1);

            // Neutral 2 (Surface Variant / Outline)
            JSObject n2 = new JSObject();
            n2.put("0", getColorHex(android.R.color.system_neutral2_0));
            n2.put("10", getColorHex(android.R.color.system_neutral2_10));
            n2.put("50", getColorHex(android.R.color.system_neutral2_50));
            n2.put("100", getColorHex(android.R.color.system_neutral2_100));
            n2.put("200", getColorHex(android.R.color.system_neutral2_200));
            n2.put("300", getColorHex(android.R.color.system_neutral2_300));
            n2.put("400", getColorHex(android.R.color.system_neutral2_400));
            n2.put("500", getColorHex(android.R.color.system_neutral2_500));
            n2.put("600", getColorHex(android.R.color.system_neutral2_600));
            n2.put("700", getColorHex(android.R.color.system_neutral2_700));
            n2.put("800", getColorHex(android.R.color.system_neutral2_800));
            n2.put("900", getColorHex(android.R.color.system_neutral2_900));
            n2.put("1000", getColorHex(android.R.color.system_neutral2_1000));
            palettes.put("neutral2", n2);

            result.put("palettes", palettes);

            // 2. M3 Resolved Schemes
            JSObject schemes = new JSObject();

            // Light Mode Scheme
            // Surfaces stay in the Tone 90-100 range:
            // 0 = Tone 100, 10 = Tone 99, 50 = Tone 95, 100 = Tone 90
            JSObject light = new JSObject();
            light.put("primary", getColorHex(android.R.color.system_accent1_600));
            light.put("onPrimary", getColorHex(android.R.color.system_accent1_0));
            light.put("primaryContainer", getColorHex(android.R.color.system_accent1_100));
            light.put("onPrimaryContainer", getColorHex(android.R.color.system_accent1_900));
            light.put("secondary", getColorHex(android.R.color.system_accent2_600));
            light.put("onSecondary", getColorHex(android.R.color.system_accent2_0));
            light.put("secondaryContainer", getColorHex(android.R.color.system_accent2_100));
            light.put("onSecondaryContainer", getColorHex(android.R.color.system_accent2_900));
            light.put("tertiary", getColorHex(android.R.color.system_accent3_600));
            light.put("onTertiary", getColorHex(android.R.color.system_accent3_0));
            light.put("tertiaryContainer", getColorHex(android.R.color.system_accent3_100));
            light.put("onTertiaryContainer", getColorHex(android.R.color.system_accent3_900));
            light.put("error", "#B3261E");
            light.put("onError", "#FFFFFF");
            light.put("errorContainer", "#F9DEDC");
            light.put("onErrorContainer", "#410E0B");
            light.put("surface", getColorHex(android.R.color.system_neutral1_10));
            light.put("onSurface", getColorHex(android.R.color.system_neutral1_900));
            light.put("surfaceVariant", getColorHex(android.R.color.system_neutral2_100));
            light.put("onSurfaceVariant", getColorHex(android.R.color.system_neutral2_700));
            light.put("surfaceContainerLowest", getColorHex(android.R.color.system_neutral1_0));
            light.put("surfaceContainerLow", getColorHex(android.R.color.system_neutral1_10));
            light.put("surfaceContainer", getColorHex(android.R.color.system_neutral1_50));
            light.put("surfaceContainerHigh", getColorHex(android.R.color.system_neutral1_50));
            light.put("surfaceContainerHighest", getColorHex(android.R.color.system_neutral1_100));
            light.put("surfaceDim", getColorHex(android.R.color.system_neutral1_100));
            light.put("surfaceBright", getColorHex(android.R.color.system_neutral1_0));
            light.put("outline", getColorHex(android.R.color.system_neutral2_500));
            light.put("outlineVariant", getColorHex(android.R.color.system_neutral2_200));
            light.put("inverseSurface", getColorHex(android.R.color.system_neutral1_800));
            light.put("inverseOnSurface", getColorHex(android.R.color.system_neutral1_50));
            light.put("inversePrimary", getColorHex(android.R.color.system_accent1_200));
            light.put("background", getColorHex(android.R.color.system_neutral1_10));
            light.put("onBackground", getColorHex(android.R.color.system_neutral1_900));
            schemes.put("light", light);

            // Dark Mode Scheme
            // Surfaces stay in the Tone 0-30 range:
            // 1000 = Tone 0, 900 = Tone 10, 800 = Tone 20, 700 = Tone 30
            JSObject dark = new JSObject();
            dark.put("primary", getColorHex(android.R.color.system_accent1_200));
            dark.put("onPrimary", getColorHex(android.R.color.system_accent1_800));
            dark.put("primaryContainer", getColorHex(android.R.color.system_accent1_700));
            dark.put("onPrimaryContainer", getColorHex(android.R.color.system_accent1_100));
            dark.put("secondary", getColorHex(android.R.color.system_accent2_200));
            dark.put("onSecondary", getColorHex(android.R.color.system_accent2_800));
            dark.put("secondaryContainer", getColorHex(android.R.color.system_accent2_700));
            dark.put("onSecondaryContainer", getColorHex(android.R.color.system_accent2_100));
            dark.put("tertiary", getColorHex(android.R.color.system_accent3_200));
            dark.put("onTertiary", getColorHex(android.R.color.system_accent3_800));
            dark.put("tertiaryContainer", getColorHex(android.R.color.system_accent3_700));
            dark.put("onTertiaryContainer", getColorHex(android.R.color.system_accent3_100));
            dark.put("error", "#F2B8B5");
            dark.put("onError", "#601410");
            dark.put("errorContainer", "#8C1D18");
            dark.put("onErrorContainer", "#F9DEDC");
            dark.put("surface", getColorHex(android.R.color.system_neutral1_900));
            dark.put("onSurface", getColorHex(android.R.color.system_neutral1_100));
            dark.put("surfaceVariant", getColorHex(android.R.color.system_neutral2_700));
            dark.put("onSurfaceVariant", getColorHex(android.R.color.system_neutral2_200));
            dark.put("surfaceContainerLowest", getColorHex(android.R.color.system_neutral1_1000));
            dark.put("surfaceContainerLow", getColorHex(android.R.color.system_neutral1_900));
            dark.put("surfaceContainer", getColorHex(android.R.color.system_neutral1_800));
            dark.put("surfaceContainerHigh", getColorHex(android.R.color.system_neutral1_800));
            dark.put("surfaceContainerHighest", getColorHex(android.R.color.system_neutral1_700));
            dark.put("surfaceDim", getColorHex(android.R.color.system_neutral1_1000));
            dark.put("surfaceBright", getColorHex(android.R.color.system_neutral1_700));
            dark.put("outline", getColorHex(android.R.color.system_neutral2_400));
            dark.put("outlineVariant", getColorHex(android.R.color.system_neutral2_700));
            dark.put("inverseSurface", getColorHex(android.R.color.system_neutral1_100));
            dark.put("inverseOnSurface", getColorHex(android.R.color.system_neutral1_800));
            dark.put("inversePrimary", getColorHex(android.R.color.system_accent1_600));
            dark.put("background", getColorHex(android.R.color.system_neutral1_900));
            dark.put("onBackground", getColorHex(android.R.color.system_neutral1_100));
            schemes.put("dark", dark);

            result.put("schemes", schemes);

            call.resolve(result);
        } catch (Exception e) {
            result.put("supported", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
}
