package place.coho.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(DynamicThemeBridge.class);
        registerPlugin(ShareTargetBridge.class);
        super.onCreate(savedInstanceState);
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
        }
    }
}
