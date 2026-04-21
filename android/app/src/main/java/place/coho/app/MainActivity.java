package place.coho.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    private OnBackPressedCallback webViewBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(DynamicThemeBridge.class);
        registerPlugin(ShareTargetBridge.class);
        registerPlugin(AiBridge.class);
        registerPlugin(SpeechBridge.class);
        registerPlugin(WearSyncBridge.class);
        super.onCreate(savedInstanceState);

        // If launched from a shortcut (ACTION_VIEW with localhost data),
        // navigate the WebView to the shortcut's target path.
        handleShortcutIntent(getIntent());

        // Predictive back gesture support (Android 14+).
        // The callback is only enabled when the WebView has history, so the
        // system can show the correct predictive animation:
        //  - enabled  → in-app back: navigates WebView history
        //  - disabled → system "back to home" peek animation, then finish()
        WebView webView = getBridge().getWebView();
        webViewBackCallback = new OnBackPressedCallback(webView.canGoBack()) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge().getWebView();
                if (wv.canGoBack()) {
                    wv.goBack();
                }
                // Update enabled state after navigation
                setEnabled(wv.canGoBack());
            }
        };
        getOnBackPressedDispatcher().addCallback(this, webViewBackCallback);

        // Install a custom WebViewClient that tracks both real page loads and
        // SPA pushState/replaceState navigations via doUpdateVisitedHistory,
        // keeping the back callback's enabled state in sync with WebView history.
        Bridge bridge = getBridge();
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                webViewBackCallback.setEnabled(view.canGoBack());
            }
        });
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
