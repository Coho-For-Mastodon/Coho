package place.coho.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin that bridges the web app's server URL and access token
 * to SharedPreferences so the Glance widget can read them.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridge extends Plugin {

    static final String PREFS_NAME = "coho_widget";
    static final String PREF_SERVER = "server";
    static final String PREF_ACCESS_TOKEN = "access_token";
    static final String DEFAULT_SERVER = "mastodon.social";

    @PluginMethod
    public void setServer(PluginCall call) {
        String server = call.getString("server", DEFAULT_SERVER);
        SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(PREF_SERVER, server).apply();

        if (hasActiveWidgets()) {
            CohoWidgetReceiver.scheduleWidgetUpdates(getContext());
        }
        WidgetRefreshHelper.INSTANCE.refreshWidgets(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setCredentials(PluginCall call) {
        String server = call.getString("server", DEFAULT_SERVER);
        String accessToken = call.getString("accessToken", "");
        SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(PREF_SERVER, server)
                .putString(PREF_ACCESS_TOKEN, accessToken)
                .apply();

        // Ensure the periodic WorkManager job is scheduled when widget is active (handles reinstalls)
        if (hasActiveWidgets()) {
            CohoWidgetReceiver.scheduleWidgetUpdates(getContext());
        }
        WidgetRefreshHelper.INSTANCE.refreshWidgets(getContext());
        call.resolve();
    }

    @PluginMethod
    public void refresh(PluginCall call) {
        WidgetRefreshHelper.INSTANCE.refreshWidgets(getContext());
        call.resolve();
    }

    private boolean hasActiveWidgets() {
        AppWidgetManager mgr = AppWidgetManager.getInstance(getContext());
        ComponentName cn = new ComponentName(getContext(), CohoWidgetReceiver.class);
        return mgr.getAppWidgetIds(cn).length > 0;
    }
}
