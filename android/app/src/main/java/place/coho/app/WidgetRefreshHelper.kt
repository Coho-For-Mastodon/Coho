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
        scope.launch {
            try {
                CohoWidget().updateAll(context)
            } catch (_: Exception) {
                // Widget refresh failed — ignore
            }
        }
    }
}
