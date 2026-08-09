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
 * to the web layer. On API 31+ (Android 12+), reads the system wallpaper-derived
 * accent color. On older versions, returns null so the web app can fall back.
 */
@CapacitorPlugin(name = "DynamicThemeBridge")
public class DynamicThemeBridge extends Plugin {

    @PluginMethod
    public void getAccentColor(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int colorInt = ContextCompat.getColor(
                    getActivity(), android.R.color.system_accent1_500);
            String hex = String.format("#%06X", (0xFFFFFF & colorInt));
            result.put("color", hex);
            result.put("supported", true);
        } else {
            result.put("color", null);
            result.put("supported", false);
        }

        call.resolve(result);
    }
}
