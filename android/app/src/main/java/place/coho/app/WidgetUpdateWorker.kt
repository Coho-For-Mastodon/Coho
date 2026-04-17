package place.coho.app

import android.content.Context
import android.util.Log
import androidx.glance.appwidget.updateAll
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import java.io.IOException

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

    companion object {
        private const val TAG = "WidgetUpdateWorker"
    }

    override suspend fun doWork(): Result {
        return try {
            CohoWidget().updateAll(applicationContext)
            Result.success()
        } catch (e: IOException) {
            Log.e(TAG, "Widget update failed (transient)", e)
            Result.retry()
        } catch (e: Exception) {
            Log.e(TAG, "Widget update failed (non-transient)", e)
            Result.failure()
        }
    }
}
