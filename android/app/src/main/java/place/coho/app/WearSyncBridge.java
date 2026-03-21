package place.coho.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Tasks;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.Wearable;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Capacitor plugin that pushes auth credentials to a paired Wear OS
 * device via the Wearable Data Layer API.
 *
 * The watch-side {@code AuthSyncService} listens for DataItem changes
 * at path {@code /coho/auth} and persists the token locally.
 */
@CapacitorPlugin(name = "WearSyncBridge")
public class WearSyncBridge extends Plugin {

    private static final String TAG = "WearSyncBridge";
    private static final String DATA_PATH = "/coho/auth";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    /**
     * Push current credentials to the paired watch.
     * Expected params: server (String), accessToken (String), acct (String).
     */
    @PluginMethod
    public void syncCredentials(PluginCall call) {
        String server = call.getString("server", "");
        String accessToken = call.getString("accessToken", "");
        String acct = call.getString("acct", "");

        executor.execute(() -> {
            try {
                DataClient dataClient = Wearable.getDataClient(getContext());
                PutDataMapRequest putReq = PutDataMapRequest.create(DATA_PATH);
                putReq.getDataMap().putString("server", server);
                putReq.getDataMap().putString("accessToken", accessToken);
                putReq.getDataMap().putString("acct", acct);
                // Force update even if data hasn't changed (timestamp trick)
                putReq.getDataMap().putLong("timestamp", System.currentTimeMillis());
                putReq.setUrgent();

                Tasks.await(dataClient.putDataItem(putReq.asPutDataRequest()));
                Log.d(TAG, "Credentials synced to Wear OS for " + acct);

                getActivity().runOnUiThread(() -> call.resolve());
            } catch (Exception e) {
                Log.w(TAG, "Failed to sync credentials to Wear OS", e);
                // Resolve anyway — watch sync is best-effort and should not block the phone app
                getActivity().runOnUiThread(() -> call.resolve());
            }
        });
    }
}
