package place.coho.app.wear.sync

import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Receives DataItem updates pushed from the phone app via the Wearable Data Layer.
 * When the phone stores or updates credentials at `/coho/auth`, this service
 * persists them into local DataStore so the watch can call the Mastodon API.
 */
class AuthSyncService : WearableListenerService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        val repo = AuthRepository(applicationContext)
        for (event in dataEvents) {
            val path = event.dataItem.uri.path ?: continue
            if (path == "/coho/auth") {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                val server = dataMap.getString("server") ?: continue
                val accessToken = dataMap.getString("accessToken") ?: continue
                val acct = dataMap.getString("acct") ?: ""

                scope.launch {
                    repo.saveCredentials(server, accessToken, acct)
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
