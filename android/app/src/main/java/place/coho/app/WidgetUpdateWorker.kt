package place.coho.app

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * WorkManager worker that refreshes all Coho widget instances.
 * Scheduled as a periodic task in [CohoWidgetReceiver] so the widget
 * reliably updates every 30 minutes whenever the device has network access,
 * independent of the unreliable system updatePeriodMillis broadcast.
 */
class WidgetUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            CohoWidget().updateAll(applicationContext)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}
