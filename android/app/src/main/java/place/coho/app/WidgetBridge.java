package place.coho.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Simple Capacitor plugin that bridges the web app's server URL
 * to SharedPreferences so the Android widget can read it.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridge extends Plugin {

    @PluginMethod
    public void setServer(PluginCall call) {
        String server = call.getString("server", TrendingWidget.DEFAULT_SERVER);
        SharedPreferences prefs = getContext()
                .getSharedPreferences(TrendingWidget.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(TrendingWidget.PREF_SERVER, server).apply();

        // Trigger widget refresh so it picks up the new server
        refreshWidgets();

        call.resolve();
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        refreshWidgets();
        call.resolve();
    }

    private void refreshWidgets() {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(
                new ComponentName(context, TrendingWidget.class));
        if (ids != null && ids.length > 0) {
            for (int id : ids) {
                TrendingWidget.updateWidget(context, manager, id);
            }
        }
    }
}
