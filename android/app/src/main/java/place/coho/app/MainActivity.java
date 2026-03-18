package place.coho.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private OnBackInvokedCallback backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(DynamicThemeBridge.class);
        registerPlugin(ShareTargetBridge.class);
        super.onCreate(savedInstanceState);

        // If launched from a shortcut (ACTION_VIEW with localhost data),
        // navigate the WebView to the shortcut's target path.
        handleShortcutIntent(getIntent());

        // Register predictive back callback for Android 13+ (API 33).
        // This replaces the deprecated onBackPressed() and enables the
        // native predictive back animation (peek at previous page / home).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback = () -> {
                WebView webView = getBridge().getWebView();
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            };
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        String action = intent.getAction();
        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            // Notify the web layer that new shared content arrived
            ShareTargetBridge plugin = (ShareTargetBridge) getBridge().getPlugin("ShareTargetBridge").getInstance();
            if (plugin != null) {
                plugin.notifyShareIntent();
            }
        } else if (Intent.ACTION_VIEW.equals(action)) {
            // Handle shortcut taps when the app is already running
            handleShortcutIntent(intent);
        }
    }

    /**
     * If the intent carries a localhost URL (from a static shortcut),
     * extract the path + query and navigate the WebView there.
     */
    private void handleShortcutIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }
        Uri data = intent.getData();
        if (data == null) return;

        String host = data.getHost();
        if (!"localhost".equals(host)) return;

        String path = data.getPath();
        if (path == null || path.equals("/")) return;

        String query = data.getQuery();
        String url = path + (query != null ? "?" + query : "");

        // Wait for the bridge to be ready, then navigate
        getBridge().getWebView().post(() -> {
            getBridge().getWebView().loadUrl("https://localhost" + url);
        });
    }
}
