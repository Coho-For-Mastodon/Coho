package place.coho.app

import android.content.Context
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Helper object that Java code can call to trigger Glance widget updates.
 * Glance's updateAll() is a suspend function, so we need a coroutine scope.
 */
object WidgetRefreshHelper {
    private val scope = CoroutineScope(Dispatchers.IO)

    fun refreshWidgets(context: Context) {
        // Re-render immediately from disk cache (fast, no network).
        scope.launch {
            try {
                CohoWidget().updateAll(context)
            } catch (_: Exception) {
                // Widget render failed — ignore
            }
        }
        // Also kick off a background fetch so the widget gets fresh data shortly after.
        WidgetUpdateWorker.enqueueOneTimeRefresh(context)
    }
}
